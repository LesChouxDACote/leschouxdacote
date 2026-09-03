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

// première vraie erreur du build (lint, types, compilation…) ; les autres lignes du log sont du contexte
const ERROR_MARKER =
  /Failed to compile|error TS\d+|✖ \d+ problems?|Module not found|Type error:|Cannot find module|ERROR:|npm ERR!|FATAL ERROR|Killed|exit code: [1-9]|ENOMEM|out of memory/
// bruit Docker/BuildKit, métadonnées PHP de Coolify, bandeau télémétrie Next
const NOISE =
  /SecretsUsedInArgOrEnv|UndefinedVar|Error response from daemon: No such container|\d+ warnings? found \(use docker|^Dockerfile:\d+|^\s*\d+ \||^-{5,}$|^={5,}$|^Error type:|^Error code:|^Location:|^Stack trace|^#\d+ \/var\/www\/html|Gracefully shutting down|Next\.js now collects completely anonymous telemetry|This information is used to shape|You can learn more, including how to opt-out|nextjs\.org\/telemetry$/
const ERROR_CONTEXT_BEFORE = 5
const ERROR_WINDOW = 55
const TAIL_LINES = 12

// préfixes BuildKit (« #14 7.364 ») : les mêmes lignes réapparaissent sans eux dans le récapitulatif d'erreur
const normalized = (line: string) =>
  line
    .replace(/^#\d+ /, "")
    .replace(/^\d+\.\d+ /, "")
    .trim()

// logs du déploiement Coolify → extrait exploitable : toutes les entrées (y compris celles repliées dans l'UI),
// sans le récapitulatif « Deployment failed » qui rejoue tout le log, sans bruit ni doublons, centré sur la
// première erreur du build et complété par la conclusion
export const excerptFromLogs = (logs: string) => {
  let outputs: string[]
  try {
    const entries = Sc.decodeUnknownOption(Sc.Array(CoolifyLogEntry))(JSON.parse(logs))
    outputs = Option.isSome(entries)
      ? entries.value.map((entry) => {
          const output = entry.output ?? ""
          return output.startsWith("Deployment failed") ? output.split("\n")[0] : output
        })
      : [logs]
  } catch {
    outputs = [logs]
  }
  const seen = new Set<string>()
  const lines = outputs
    .flatMap((output) => output.split("\n"))
    .map((line) => scrub(line).trimEnd())
    .filter((line) => line.trim() !== "" && !NOISE.test(line.trim()))
    .filter((line) => {
      const key = normalized(line)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  const errorIndex = lines.findIndex((line) => ERROR_MARKER.test(line))
  let excerpt: string
  if (errorIndex === -1) {
    excerpt = lines.slice(-LOG_LINES).join("\n")
  } else {
    const start = Math.max(0, errorIndex - ERROR_CONTEXT_BEFORE)
    const window = lines.slice(start, start + ERROR_WINDOW)
    const tail = lines.slice(Math.max(start + ERROR_WINDOW, lines.length - TAIL_LINES))
    excerpt = [...window, ...(tail.length > 0 ? ["…", ...tail] : [])].join("\n")
  }
  return excerpt.length > LOG_CHARS ? `${excerpt.slice(0, LOG_CHARS)}\n…` : excerpt
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

// relance le déploiement du preview sans permission « deploy » sur l'API : un commit vide poussé sur la
// branche de la PR déclenche le preview via le webhook GitHub, comme n'importe quel push
export const retriggerDeployment = (worktree: string, branch: string, reason: string) =>
  Effect.gen(function* () {
    const { exec } = yield* Shell
    yield* exec(
      "git",
      ["commit", "--allow-empty", "-m", `chore: relance du déploiement du preview (${reason})`],
      worktree,
    )
    const sha = yield* exec("git", ["rev-parse", "HEAD"], worktree)
    yield* exec("git", ["push", "-u", "origin", branch], worktree)
    return sha
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
            since = new Date()
            sha = yield* retriggerDeployment(ticket.worktree, ticket.branch, "échec non reproduit en local")
            yield* trello.addComment(
              ticket.card.id,
              `🔁 Le déploiement du preview a échoué mais le build passe en local : nouveau déploiement déclenché (tentative ${attemptNumber}/${fixAttempts}).${pageLine}`,
            )
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
            console.log("  Aucun changement de code : nouveau déploiement déclenché")
            sha = yield* retriggerDeployment(ticket.worktree, ticket.branch, "aucun changement de code")
            yield* trello.addComment(
              ticket.card.id,
              truncate(`🔁 Aucun changement de code d'après l'IA, nouveau déploiement déclenché :\n\n${output.result}`),
            )
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

// état du preview d'une PR déjà livrée : dernier déploiement connu de Coolify et, s'il a échoué, son diagnostic
export interface PreviewState {
  readonly deployment: Option.Option<CoolifyDeployment>
  readonly healthy: boolean // dernier déploiement terminé avec succès
  readonly pending: boolean // déploiement en cours ou en file d'attente
  readonly diagnostic: Option.Option<string>
}

export const previewState = (prUrl: string) =>
  Effect.gen(function* () {
    const coolify = yield* CoolifyClient
    const deployment = yield* coolify.latestDeploymentFor(Number(prUrl.split("/").pop()))
    const status = Option.isSome(deployment) ? deployment.value.status : undefined
    const state: PreviewState = {
      deployment,
      healthy: status === "finished",
      pending: status === "queued" || status === "in_progress",
      diagnostic:
        Option.isSome(deployment) && status === "failed"
          ? Option.some(
              deployment.value.logs ? excerptFromLogs(deployment.value.logs) : "(logs du déploiement non disponibles)",
            )
          : Option.none(),
    }
    return state
  })

// bloc injecté dans le prompt d'itération quand le preview n'est pas sain (undefined sinon)
export const previewStatusBlock = (state: PreviewState) => {
  if (state.healthy || state.pending) {
    return undefined
  }
  if (Option.isNone(state.deployment)) {
    return "État du preview de la PR : aucun déploiement trouvé côté Coolify."
  }
  const { commit, created_at, status } = state.deployment.value
  const intro = `État du preview de la PR : le dernier déploiement (commit ${(commit ?? "?").slice(0, 7)}, ${created_at ?? "date inconnue"}) est « ${status} ».`
  if (Option.isNone(state.diagnostic)) {
    return intro
  }
  return `${intro}
Corriger la cause de cet échec est la PRIORITÉ de cette itération. N'exécute pas « yarn build » toi-même (indisponible dans cet environnement) : appuie-toi sur l'extrait des logs, « yarn tsc » et « yarn eslint ».
Extrait des logs du déploiement :
\`\`\`
${state.diagnostic.value}
\`\`\``
}
