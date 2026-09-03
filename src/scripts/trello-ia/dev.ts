// Développement (« Ready IA ») : plan, implémentation, PR, preview
import { Cause, Effect, Option } from "effect"
import { unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { claudeArgsFor, ClaudeRunner } from "./claude"
import { AppConfig } from "./config"
import { CoolifyClient } from "./coolify"
import { commitAndPush, DEV_ARGS, implementArgs, pendingChanges, verifyAndFix } from "./delivery"
import { ensurePreviewDeployed, previewState, previewStatusBlock, retriggerDeployment } from "./deploy"
import { WatcherError } from "./errors"
import { Git } from "./git"
import type { ResolvedLists } from "./lists"
import { Preview } from "./preview"
import { IMPLEMENT_PROMPT, iterationPrompt, planPrompt, retryPrompt } from "./prompts"
import type { ClaudeOutput, TrelloCard } from "./schemas"
import { Shell } from "./shell"
import { StateStore } from "./state"
import { loadTicketContext, ticketContextBlock, ticketPaths, truncate, uuidForTicket } from "./ticket"
import { TrelloClient } from "./trello"

const logError = (error: unknown) => Effect.sync(() => console.error(error))

export const processCard = (card: TrelloCard, lists: ResolvedLists) =>
  Effect.gen(function* () {
    const { baseBranch, worktreesDir, fixAttempts } = yield* AppConfig
    const trello = yield* TrelloClient
    const store = yield* StateStore
    const git = yield* Git
    const { exec } = yield* Shell
    const claude = yield* ClaudeRunner
    const preview = yield* Preview
    const coolify = yield* CoolifyClient

    const paths = ticketPaths(worktreesDir, card)
    const { branch, worktree } = paths
    const state = (yield* store.read)[card.idShort]
    // ticket déjà livré remis en Ready = le PO demande une itération sur la même branche/PR
    const isIteration = state?.status === "done"

    console.log(`\n▶ Ticket #${card.idShort} « ${card.name} » → ${branch}${isIteration ? " (itération)" : ""}`)
    yield* trello.moveCard(card.id, lists.wip.id) // « claim » : évite tout retraitement pendant le run

    // 1. Worktree isolé sur une branche issue de la branche de base (sous verrou : la voie de
    // cadrage peut faire un fetch/worktree au même moment)
    const branchOnOrigin = yield* git.locked(
      Effect.gen(function* () {
        yield* exec("git", ["fetch", "origin", baseBranch])
        yield* git.removeWorktreeFiles(paths) // nettoie les restes d'un run précédent
        const exists = yield* exec("git", ["ls-remote", "--exit-code", "--heads", "origin", branch]).pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        )

        if (exists && !state?.sessionId) {
          return yield* Effect.fail(
            new WatcherError({ message: `la branche ${branch} existe déjà sur origin (créée hors automatisation)` }),
          )
        }

        if (exists) {
          // retry ou itération : on repart de l'état déjà poussé
          yield* exec("git", ["fetch", "origin", branch])
          yield* exec("git", ["worktree", "add", worktree, "-B", branch, `origin/${branch}`])
        } else {
          yield* exec("git", ["worktree", "add", worktree, "-b", branch, `origin/${baseBranch}`])
        }
        return exists
      }),
    )
    if (!branchOnOrigin) {
      yield* exec("git", ["push", "-u", "origin", branch], worktree)
      console.log(`  Branche ${branch} créée depuis ${baseBranch} et poussée`)
    }
    console.log("  yarn install…")
    yield* exec("yarn", ["install"], worktree)

    // 2. Contexte complet du ticket (carte, checklists, pièces jointes, discussion de cadrage)
    const context = yield* loadTicketContext(card, worktree)
    const ticketBlock = ticketContextBlock(context)
    // itération : si le dernier déploiement du preview a échoué, ses logs entrent dans le prompt
    const previewBefore =
      isIteration && coolify.enabled && state?.prUrl ? Option.some(yield* previewState(state.prUrl)) : Option.none()
    const previewStatus = Option.isSome(previewBefore) ? previewStatusBlock(previewBefore.value) : undefined
    if (Option.isSome(previewBefore)) {
      const status = Option.map(previewBefore.value.deployment, (deployment) => deployment.status)
      console.log(`  Dernier déploiement du preview : ${Option.getOrElse(status, () => "introuvable")}`)
    }
    const claudeArgs = claudeArgsFor(context.details)
    const planArgs = ["-p", planPrompt(ticketBlock), ...DEV_ARGS, ...claudeArgs]

    // 3. Plan puis implémentation par Claude, dans la session du ticket
    let lastOutput: ClaudeOutput
    if (state?.sessionId) {
      console.log(`  Reprise de la session existante ${state.sessionId}${isIteration ? " (itération)" : ""}…`)
      lastOutput = yield* claude
        .run(
          implementArgs(
            state.sessionId,
            isIteration ? iterationPrompt(card, ticketBlock, previewStatus) : retryPrompt(card, ticketBlock),
            claudeArgs,
          ),
          worktree,
        )
        .pipe(
          Effect.catch((error) =>
            Effect.gen(function* () {
              console.error("  Reprise impossible, nouvelle session :", error)
              const plan = yield* claude.run(planArgs, worktree)
              yield* store.save(card.idShort, { sessionId: plan.session_id, branch, status: "plan" })
              yield* trello.addComment(card.id, truncate(`📋 Plan (nouvelle tentative) :\n\n${plan.result}`))
              return yield* claude.run(implementArgs(plan.session_id, IMPLEMENT_PROMPT, claudeArgs), worktree)
            }),
          ),
        )
      yield* store.save(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
    } else {
      console.log("  Génération du plan…")
      const plan = yield* claude.runNewSession(planArgs, uuidForTicket(card.idShort), worktree)
      yield* store.save(card.idShort, { sessionId: plan.session_id, branch, status: "plan" })
      writeFileSync(path.join(worktree, ".ia-plan.md"), plan.result)
      yield* trello.addComment(card.id, truncate(`📋 Plan :\n\n${plan.result}`))

      console.log("  Implémentation du plan…")
      lastOutput = yield* claude.run(implementArgs(plan.session_id, IMPLEMENT_PROMPT, claudeArgs), worktree)
      yield* store.save(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
    }

    // 4. Garde-fous (Prettier, ESLint, tsc) avec correction par Claude, puis commit + push par l'orchestrateur
    const verified = yield* verifyAndFix(card, worktree, lastOutput.session_id, claudeArgs)
    if (!verified.ok && verified.diagnostic) {
      return yield* Effect.fail(
        new WatcherError({
          message: `garde-fou « ${verified.diagnostic.step} » toujours en échec après ${fixAttempts} correction(s) :\n${verified.diagnostic.output}`,
        }),
      )
    }
    const changes = yield* pendingChanges(worktree)
    if (!changes) {
      if (isIteration) {
        // Claude a jugé qu'aucune modification n'était nécessaire : on l'explique au PO
        console.log("  Itération sans changement de code")
        yield* store.save(card.idShort, { status: "done" }) // le run l'avait passé à « implement »
        yield* trello.addComment(
          card.id,
          truncate(`♻️ Aucun changement nécessaire d'après l'IA :\n\n${lastOutput.result}`),
        )
        // preview absent, en échec ou en cours : on ne referme pas le ticket sans l'avoir vu en ligne
        const previewAfter = coolify.enabled && state?.prUrl ? yield* previewState(state.prUrl) : undefined
        if (previewAfter && state?.prUrl && !previewAfter.healthy) {
          const pending = previewAfter.pending ? Option.getOrUndefined(previewAfter.deployment) : undefined
          const pushedAt = pending?.created_at ? new Date(pending.created_at) : new Date()
          const sha = pending
            ? (pending.commit ?? "")
            : yield* retriggerDeployment(worktree, branch, "itération sans changement, preview absent ou en échec")
          console.log(
            pending
              ? "  Déploiement du preview en cours : suivi"
              : `  Preview non sain : déploiement relancé (${sha.slice(0, 7)})`,
          )
          const live = yield* ensurePreviewDeployed({
            card,
            branch,
            worktree,
            prUrl: state.prUrl,
            sha,
            pushedAt,
            sessionId: verified.sessionId,
            claudeArgs,
          })
          yield* git.removeWorktree(paths)
          if (live) {
            yield* trello.moveCard(card.id, lists.done.id)
          }
          return
        }
        yield* trello.moveCard(card.id, lists.done.id)
        yield* git.removeWorktree(paths)
        return
      }
      return yield* Effect.fail(new WatcherError({ message: "aucun changement produit par l'implémentation" }))
    }
    // sans API Coolify, sur une itération, le 🌐 n'est posté que quand le preview sert un build plus récent
    const buildIdBeforePush =
      isIteration && !coolify.enabled ? yield* preview.buildId(preview.urlFor(state?.prUrl)) : undefined
    const pushedAt = new Date()
    const sha = yield* commitAndPush(worktree, branch, `feat: ${card.name} (Trello #${card.idShort})`)
    console.log("  Changements commités et poussés")

    // 5. Pull request vers la branche de base (réutilisée si déjà ouverte : le push l'a mise à jour)
    const existingPrOutput = yield* exec(
      "gh",
      ["pr", "list", "--head", branch, "--state", "open", "--json", "url", "--jq", ".[].url"],
      worktree,
    ).pipe(Effect.orElseSucceed(() => ""))
    let prUrl = existingPrOutput.split("\n").filter(Boolean)[0] || ""
    if (prUrl) {
      console.log(`  PR existante mise à jour : ${prUrl}`)
    } else {
      const bodyFile = path.join(tmpdir(), `ia-pr-${card.idShort}.md`)
      writeFileSync(
        bodyFile,
        `Ticket Trello : ${card.shortUrl}\n\n${lastOutput.result}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
      )
      prUrl = yield* exec(
        "gh",
        [
          "pr",
          "create",
          "--base",
          baseBranch,
          "--head",
          branch,
          "--title",
          `[IA] #${card.idShort} ${card.name}`,
          "--body-file",
          bodyFile,
        ],
        worktree,
      ).pipe(Effect.ensuring(Effect.sync(() => unlinkSync(bodyFile))))
      console.log(`  PR créée : ${prUrl}`)
    }
    const previewUrl = preview.urlFor(prUrl)
    console.log(
      previewUrl ? `  Preview attendue : ${previewUrl}` : "  PREVIEW_URL_TEMPLATE non définie : pas de lien preview",
    )

    // 6. Rapport sur la carte
    yield* store.save(card.idShort, { status: "done", prUrl })
    yield* trello.addComment(
      card.id,
      `${isIteration ? "✅ Nouvelle itération terminée." : "✅ Implémentation terminée."}\nBranche : ${branch}\nPR : ${prUrl}${preview.lineFor(
        prUrl,
        isIteration
          ? "⏳ Preview en cours de mise à jour (l'ancienne version répond en attendant)"
          : "⏳ Preview en cours de déploiement",
      )}`,
    )

    // 7. Preview et nettoyage
    if (coolify.enabled) {
      // suivi du déploiement via l'API Coolify, avec correction des échecs : la carte ne passe dans
      // « IA terminé » qu'une fois le preview en ligne ; sinon elle reste dans « IA en cours » avec le ⚠️
      const live = yield* ensurePreviewDeployed({
        card,
        branch,
        worktree,
        prUrl,
        sha,
        pushedAt,
        sessionId: verified.sessionId,
        claudeArgs,
      })
      yield* git.removeWorktree(paths)
      if (live) {
        yield* trello.moveCard(card.id, lists.done.id)
      }
    } else {
      yield* trello.moveCard(card.id, lists.done.id)
      yield* git.removeWorktree(paths)
      // fibre détachée : le watcher continue de traiter les tickets pendant l'attente du preview
      yield* Effect.forkDetach(preview.notifyWhenLive(card, prUrl, buildIdBeforePush).pipe(Effect.catch(logError)))
    }
  })

// échec (erreur typée ou défaut) : ⚠️ sur la carte, statut « failed », worktree nettoyé.
// La carte reste dans la liste WIP : un humain décide de la remettre en Ready ou non.
export const reportFailure = (card: TrelloCard, cause: Cause.Cause<unknown>) =>
  Effect.gen(function* () {
    const error = Cause.squash(cause)
    console.error(error)
    const { worktreesDir } = yield* AppConfig
    const trello = yield* TrelloClient
    const store = yield* StateStore
    const git = yield* Git
    yield* store.save(card.idShort, { status: "failed" })
    const message = error instanceof Error ? error.message : String(error)
    yield* trello
      .addComment(card.id, truncate(`⚠️ Automatisation IA échouée : ${message}`))
      .pipe(Effect.catch(logError))
    yield* git.removeWorktree(ticketPaths(worktreesDir, card)).pipe(Effect.catch(logError))
  })
