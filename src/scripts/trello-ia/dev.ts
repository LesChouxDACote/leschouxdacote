// Développement (« Ready IA ») : plan, implémentation, PR
import { Cause, Effect } from "effect"
import { existsSync, rmSync, unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { claudeArgsFor, ClaudeRunner } from "./claude"
import { AppConfig } from "./config"
import { WatcherError } from "./errors"
import { Git } from "./git"
import type { ResolvedLists } from "./lists"
import { Preview } from "./preview"
import { IMPLEMENT_PROMPT, iterationPrompt, planPrompt, retryPrompt } from "./prompts"
import type { ClaudeOutput, TrelloCard } from "./schemas"
import { Shell } from "./shell"
import { StateStore } from "./state"
import { loadTicketContext, TICKET_DIR, ticketContextBlock, ticketPaths, truncate, uuidForTicket } from "./ticket"
import { TrelloClient } from "./trello"

const DEV_ARGS = ["--output-format", "json", "--permission-mode", "acceptEdits"]
const ALLOWED_TOOLS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "Bash(yarn tsc:*)",
  "Bash(yarn lint:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
]

const logError = (error: unknown) => Effect.sync(() => console.error(error))

// fichiers touchés par le ticket : commités depuis la branche de base (tentatives précédentes)
// et modifications en attente, existants dans le worktree
const touchedFilesIn = (worktree: string, committedFiles: string, statusLines: string) => {
  const pendingFiles = statusLines
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3)
      return (raw.includes(" -> ") ? raw.split(" -> ")[1] : raw).replace(/^"|"$/g, "")
    })
  return Array.from(new Set([...committedFiles.split("\n").filter(Boolean), ...pendingFiles])).filter((file) =>
    existsSync(path.join(worktree, file)),
  )
}

export const processCard = (card: TrelloCard, lists: ResolvedLists) =>
  Effect.gen(function* () {
    const { baseBranch, worktreesDir } = yield* AppConfig
    const trello = yield* TrelloClient
    const store = yield* StateStore
    const git = yield* Git
    const { exec } = yield* Shell
    const claude = yield* ClaudeRunner
    const preview = yield* Preview

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
    const claudeArgs = claudeArgsFor(context.details)
    const planArgs = ["-p", planPrompt(ticketBlock), ...DEV_ARGS, ...claudeArgs]
    const implementArgs = (sessionId: string, prompt: string) => [
      "-p",
      "--resume",
      sessionId,
      prompt,
      ...DEV_ARGS,
      ...claudeArgs,
      "--allowedTools",
      ...ALLOWED_TOOLS,
    ]

    // 3. Plan puis implémentation par Claude, dans la session du ticket
    let lastOutput: ClaudeOutput
    if (state?.sessionId) {
      console.log(`  Reprise de la session existante ${state.sessionId}${isIteration ? " (itération)" : ""}…`)
      lastOutput = yield* claude
        .run(
          implementArgs(
            state.sessionId,
            isIteration ? iterationPrompt(card, ticketBlock) : retryPrompt(card, ticketBlock),
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
              return yield* claude.run(implementArgs(plan.session_id, IMPLEMENT_PROMPT), worktree)
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
      lastOutput = yield* claude.run(implementArgs(plan.session_id, IMPLEMENT_PROMPT), worktree)
      yield* store.save(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
    }

    // 4. Garde-fous typage + formatage puis commit + push par l'orchestrateur
    console.log("  Vérification tsc…")
    yield* exec("yarn", ["tsc", "--skipLibCheck", "--noEmit"], worktree)

    const planFile = path.join(worktree, ".ia-plan.md")
    if (existsSync(planFile)) {
      unlinkSync(planFile)
    }
    rmSync(path.join(worktree, TICKET_DIR), { recursive: true, force: true }) // pièces jointes jamais commitées

    // le build Next échoue sur la règle prettier/prettier : on formate tout ce que le ticket a touché,
    // y compris les commits déjà poussés lors d'une tentative précédente (retry)
    const committedFiles = yield* exec("git", ["diff", "--name-only", `origin/${baseBranch}...HEAD`], worktree)
    const statusLines = yield* exec("git", ["status", "--porcelain"], worktree)
    const touchedFiles = touchedFilesIn(worktree, committedFiles, statusLines)
    const prettierFiles = touchedFiles.filter((file) => /\.(ts|tsx|js|jsx|json|css|scss|md)$/.test(file))
    if (prettierFiles.length > 0) {
      console.log("  Formatage Prettier…")
      yield* exec("yarn", ["prettier", "--write", ...prettierFiles], worktree)
    }
    const lintFiles = touchedFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
    if (lintFiles.length > 0) {
      console.log("  ESLint --fix…")
      yield* exec("yarn", ["eslint", "--fix", ...lintFiles], worktree)
    }

    const changes = yield* exec("git", ["status", "--porcelain"], worktree)
    if (!changes) {
      if (isIteration) {
        // Claude a jugé qu'aucune modification n'était nécessaire : on l'explique au PO
        console.log("  Itération sans changement de code")
        yield* store.save(card.idShort, { status: "done" }) // le run l'avait passé à « implement »
        yield* trello.addComment(
          card.id,
          truncate(`♻️ Aucun changement nécessaire d'après l'IA :\n\n${lastOutput.result}`),
        )
        yield* trello.moveCard(card.id, lists.done.id)
        yield* git.removeWorktree(paths)
        return
      }
      return yield* Effect.fail(new WatcherError({ message: "aucun changement produit par l'implémentation" }))
    }
    yield* exec("git", ["add", "-A"], worktree)
    yield* exec("git", ["commit", "-m", `feat: ${card.name} (Trello #${card.idShort})`], worktree)
    // capturé avant le push : sur une itération, le 🌐 n'est posté que quand le preview sert un build plus récent
    const buildIdBeforePush = isIteration ? yield* preview.buildId(preview.urlFor(state?.prUrl)) : undefined
    yield* exec("git", ["push", "-u", "origin", branch], worktree)
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

    // 6. Rapport sur la carte et nettoyage
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
    yield* trello.moveCard(card.id, lists.done.id)
    yield* git.removeWorktree(paths)
    // fibre détachée : le watcher continue de traiter les tickets pendant l'attente du preview
    yield* Effect.forkDetach(preview.notifyWhenLive(card, prUrl, buildIdBeforePush).pipe(Effect.catch(logError)))
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
