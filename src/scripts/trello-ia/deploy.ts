// Suivi du déploiement du preview Coolify d'une PR et correction automatique des échecs
import { Effect, Option, Schema as Sc, Schedule } from "effect"
import { ClaudeRunner } from "./claude"
import { AppConfig } from "./config"
import { CoolifyClient } from "./coolify"
import { commitAndPush, Diagnostic, implementArgs, pendingChanges, verifyAndFix } from "./delivery"
import { Preview } from "./preview"
import { fixPrompt } from "./prompts"
import { CoolifyDeployment, CoolifyLogEntry, TrelloCard } from "./schemas"
import { Shell } from "./shell"
import { StateStore } from "./state"
import { truncate } from "./ticket"
import { TrelloClient } from "./trello"

const POLL_INTERVAL = "30 seconds"
const APPEAR_TIMEOUT_MS = 5 * 60 * 1000 // délai max d'apparition du déploiement après le push (webhook GitHub → Coolify)
const CLOCK_TOLERANCE_MS = 60 * 1000
const BUILD_TIMEOUT = "20 minutes" // reproduction locale du build
const LOG_LINES = 80
const LOG_CHARS = 6000

export type DeploymentOutcome =
  | { readonly kind: "finished"; readonly deployment: CoolifyDeployment }
  // logExcerpt : None quand l'API ne renvoie pas les logs (Coolify 4.3.x)
  | { readonly kind: "failed"; readonly deployment: CoolifyDeployment; readonly logExcerpt: Option.Option<string> }
  | { readonly kind: "cancelled"; readonly deployment: CoolifyDeployment }
  | { readonly kind: "not-found" } // aucun déploiement détecté pour la PR
  | { readonly kind: "timeout" } // déploiement toujours pas terminé après IA_DEPLOY_TIMEOUT_MINUTES

// déploiement de la PR déclenché par notre push (ou notre relance) : créé après `since`, de préférence sur le
// commit poussé (les déploiements lancés à la main dans Coolify n'ont pas toujours le sha)
export const matchDeployment = (
  deployments: ReadonlyArray<CoolifyDeployment>,
  prNumber: number,
  sha: string,
  since: Date,
) => {
  const recent = deployments.filter(
    (deployment) =>
      deployment.pull_request_id === prNumber &&
      deployment.created_at != null &&
      new Date(deployment.created_at).getTime() >= since.getTime() - CLOCK_TOLERANCE_MS,
  )
  return recent.find((deployment) => deployment.commit?.startsWith(sha)) ?? recent[0]
}

// identifiants dans les URL git (Coolify les caviarde déjà, ceinture et bretelles)
const scrub = (line: string) =>
  line
    .replace(/(https?:\/\/)[^\s/@]+@/g, "$1<REDACTED>@")
    .replace(/x-access-token:[^@\s]+/g, "x-access-token:<REDACTED>")

// fin des logs du déploiement (Nixpacks/Docker y répètent l'erreur du build), sans les lignes vides
export const excerptFromLogs = (logs: string) => {
  let lines: string[]
  try {
    const entries = Sc.decodeUnknownOption(Sc.Array(CoolifyLogEntry))(JSON.parse(logs))
    lines = Option.isSome(entries)
      ? entries.value.filter((entry) => !entry.hidden).flatMap((entry) => (entry.output ?? "").split("\n"))
      : logs.split("\n")
  } catch {
    lines = logs.split("\n")
  }
  const useful = lines.map((line) => scrub(line).trimEnd()).filter((line) => line.trim() !== "")
  const tail = useful.slice(-LOG_LINES).join("\n")
  return tail.length > LOG_CHARS ? `…${tail.slice(-LOG_CHARS)}` : tail
}

// attend l'issue du déploiement de la PR pour le commit `sha` poussé à `since` (sondage toutes les 30 s)
export const waitForDeployment = (prNumber: number, sha: string, since: Date) =>
  Effect.gen(function* () {
    const { deployTimeoutMs } = yield* AppConfig
    const coolify = yield* CoolifyClient
    const startedAt = Date.now()

    const poll: Effect.Effect<Option.Option<DeploymentOutcome>> = Effect.gen(function* () {
      const deployments = yield* coolify.listDeployments
      const deployment = matchDeployment(deployments, prNumber, sha, since)
      if (!deployment) {
        return Date.now() - startedAt > APPEAR_TIMEOUT_MS
          ? Option.some<DeploymentOutcome>({ kind: "not-found" })
          : Option.none<DeploymentOutcome>()
      }
      switch (deployment.status) {
        case "finished":
          return Option.some<DeploymentOutcome>({ kind: "finished", deployment })
        case "failed": {
          const full = yield* coolify.getDeployment(deployment.deployment_uuid)
          const logExcerpt = full.logs ? Option.some(excerptFromLogs(full.logs)) : Option.none<string>()
          return Option.some<DeploymentOutcome>({ kind: "failed", deployment: full, logExcerpt })
        }
        case "cancelled-by-user":
          return Option.some<DeploymentOutcome>({ kind: "cancelled", deployment })
        default:
          return Option.none<DeploymentOutcome>() // queued, in_progress
      }
    }).pipe(
      // API indisponible : on réessaie au prochain tour
      Effect.catch((error) =>
        Effect.sync(() => {
          console.error("  Coolify injoignable, nouvel essai dans 30 s :", error)
          return Option.none<DeploymentOutcome>()
        }),
      ),
    )

    const outcome = yield* poll.pipe(
      Effect.repeat({ schedule: Schedule.spaced(POLL_INTERVAL), until: Option.isSome }),
      Effect.timeoutOption(deployTimeoutMs),
      Effect.map(Option.flatten),
    )
    return Option.getOrElse(outcome, (): DeploymentOutcome => ({ kind: "timeout" }))
  })

// à défaut des logs du déploiement, rejoue « yarn build » dans le worktree : une erreur avant la collecte des
// pages (lint, types, compilation) est reproductible ici ; au-delà, le build dépend des données et variables
// d'environnement du preview, donc non reproductible
const reproduceBuild = (worktree: string) =>
  Effect.gen(function* () {
    const { exec } = yield* Shell
    console.log("  Logs du déploiement non exposés par l'API Coolify : reproduction du build en local (yarn build)…")
    const diagnostic = yield* exec("yarn", ["build"], worktree, { BUILD_CPUS: "1" }).pipe(
      Effect.as(Option.none<Diagnostic>()),
      Effect.catch((error) =>
        Effect.succeed(
          /Collecting page data|Generating static pages/.test(error.output ?? "")
            ? Option.none<Diagnostic>()
            : Option.some<Diagnostic>({
                step: "yarn build (reproduction locale)",
                output: error.output || error.message,
              }),
        ),
      ),
      Effect.timeoutOrElse({
        duration: BUILD_TIMEOUT,
        orElse: () =>
          Effect.sync(() => {
            console.log("  yarn build local : temps dépassé")
            return Option.none<Diagnostic>()
          }),
      }),
    )
    console.log(Option.isSome(diagnostic) ? "  Échec du build reproduit en local" : "  Échec non reproduit en local")
    return diagnostic
  })

export interface DeliveredTicket {
  readonly card: TrelloCard
  readonly branch: string
  readonly worktree: string
  readonly prUrl: string
  readonly sha: string // commit poussé
  readonly pushedAt: Date
  readonly sessionId: string // session Claude du ticket (reprise pour les correctifs)
  readonly claudeArgs: ReadonlyArray<string>
}

// suit le déploiement du preview ; en cas d'échec, Claude corrige à partir du diagnostic (logs du déploiement
// ou reproduction locale du build), IA_FIX_ATTEMPTS fois max. Renvoie true si le preview est en ligne.
// Les commentaires 🛠️/🔁 racontent chaque tentative sur la carte.
export const ensurePreviewDeployed = (ticket: DeliveredTicket) =>
  Effect.gen(function* () {
    const { fixAttempts, deployTimeoutMs } = yield* AppConfig
    const trello = yield* TrelloClient
    const coolify = yield* CoolifyClient
    const claude = yield* ClaudeRunner
    const store = yield* StateStore
    const preview = yield* Preview
    const prNumber = Number(ticket.prUrl.split("/").pop())
    const url = preview.urlFor(ticket.prUrl)

    const giveUp = (text: string) =>
      Effect.gen(function* () {
        console.log(`  ${text.split("\n")[0]}`)
        yield* trello.addComment(ticket.card.id, truncate(text))
        return false
      })

    let sha = ticket.sha
    let since = ticket.pushedAt
    let sessionId = ticket.sessionId
    for (let attempt = 0; ; attempt++) {
      console.log(`  Suivi du déploiement Coolify du preview (PR #${prNumber}, commit ${sha.slice(0, 7)})…`)
      const outcome = yield* waitForDeployment(prNumber, sha, since)
      switch (outcome.kind) {
        case "finished":
          console.log(`  Preview déployé${url ? ` : ${url}` : ""}`)
          yield* trello.addComment(ticket.card.id, `🌐 Preview en ligne${url ? ` : ${url}` : ""}`)
          return true
        case "not-found":
          return yield* giveUp(
            `⚠️ Aucun déploiement Coolify détecté pour la PR #${prNumber} après ${APPEAR_TIMEOUT_MS / 60000} min : vérifier le webhook GitHub → Coolify et les previews de l'application.`,
          )
        case "timeout":
          return yield* giveUp(
            `⚠️ Le déploiement du preview n'est toujours pas terminé après ${deployTimeoutMs / 60000} min.`,
          )
        case "cancelled":
          return yield* giveUp("⚠️ Déploiement du preview annulé côté Coolify.")
        case "failed": {
          const page = coolify.deploymentPage(outcome.deployment)
          const pageLine = page ? `\nLogs du déploiement : ${page}` : ""
          if (attempt >= fixAttempts) {
            return yield* giveUp(
              `⚠️ Déploiement du preview toujours en échec après ${fixAttempts} tentative(s) de correction.${pageLine}`,
            )
          }
          const attemptNumber = attempt + 1
          console.log(`  Déploiement échoué (tentative de correction ${attemptNumber}/${fixAttempts})`)
          const diagnostic = Option.isSome(outcome.logExcerpt)
            ? Option.some<Diagnostic>({ step: "déploiement Coolify", output: outcome.logExcerpt.value })
            : yield* reproduceBuild(ticket.worktree)

          if (Option.isNone(diagnostic)) {
            // rien à corriger côté code : échec probablement passager (réseau, mémoire…), on relance tel quel
            yield* trello.addComment(
              ticket.card.id,
              `🔁 Le déploiement du preview a échoué mais le build passe en local : nouveau déploiement demandé à Coolify (tentative ${attemptNumber}/${fixAttempts}).${pageLine}`,
            )
            since = new Date()
            yield* coolify.triggerDeploy(prNumber)
            break
          }

          yield* trello.addComment(
            ticket.card.id,
            truncate(
              `🛠️ Le déploiement du preview a échoué, correction en cours (tentative ${attemptNumber}/${fixAttempts}) — ${diagnostic.value.step} :\n\`\`\`\n${diagnostic.value.output}\n\`\`\`${pageLine}`,
            ),
          )
          const source = Option.isSome(outcome.logExcerpt)
            ? "le déploiement du preview Coolify a échoué (extrait des logs ci-dessous)"
            : "le déploiement du preview Coolify a échoué et « yarn build » échoue aussi en local (sortie ci-dessous)"
          const output = yield* claude.run(
            implementArgs(
              sessionId,
              fixPrompt(ticket.card, attemptNumber, fixAttempts, source, diagnostic.value.output),
              ticket.claudeArgs,
            ),
            ticket.worktree,
          )
          sessionId = output.session_id
          yield* store.save(ticket.card.idShort, { sessionId })

          const verified = yield* verifyAndFix(ticket.card, ticket.worktree, sessionId, ticket.claudeArgs)
          sessionId = verified.sessionId
          if (!verified.ok && verified.diagnostic) {
            return yield* giveUp(
              `⚠️ Correctif du déploiement impossible : garde-fou « ${verified.diagnostic.step} » toujours en échec :\n\`\`\`\n${verified.diagnostic.output}\n\`\`\``,
            )
          }
          const changes = yield* pendingChanges(ticket.worktree)
          since = new Date()
          if (!changes) {
            console.log("  Aucun changement de code : nouveau déploiement demandé à Coolify")
            yield* trello.addComment(
              ticket.card.id,
              truncate(
                `🔁 Aucun changement de code d'après l'IA, nouveau déploiement demandé à Coolify :\n\n${output.result}`,
              ),
            )
            yield* coolify.triggerDeploy(prNumber)
          } else {
            sha = yield* commitAndPush(
              ticket.worktree,
              ticket.branch,
              `fix: déploiement du preview (Trello #${ticket.card.idShort})`,
            )
            console.log(`  Correctif poussé (${sha.slice(0, 7)})`)
            yield* trello.addComment(
              ticket.card.id,
              truncate(`🔁 Correctif poussé (${sha.slice(0, 7)}), nouveau déploiement en cours :\n\n${output.result}`),
            )
          }
        }
      }
    }
  })
