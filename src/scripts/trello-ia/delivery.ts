// Garde-fous et livraison d'un worktree après un passage de Claude : contrôles (avec correction par Claude),
// commit, push
import { Effect, Option } from "effect"
import { existsSync, rmSync, unlinkSync } from "fs"
import path from "path"
import { ClaudeRunner } from "./claude"
import { AppConfig } from "./config"
import type { ShellError } from "./errors"
import { fixPrompt } from "./prompts"
import type { TrelloCard } from "./schemas"
import { Shell } from "./shell"
import { StateStore } from "./state"
import { TICKET_DIR, truncate } from "./ticket"
import { TrelloClient } from "./trello"

export const DEV_ARGS = ["--output-format", "json", "--permission-mode", "acceptEdits"]
export const ALLOWED_TOOLS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "Bash(yarn tsc:*)",
  "Bash(yarn lint:*)",
  "Bash(yarn eslint:*)",
  "Bash(yarn prettier:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
]

// reprise de la session du ticket avec les outils d'édition
export const implementArgs = (sessionId: string, prompt: string, claudeArgs: ReadonlyArray<string>) => [
  "-p",
  "--resume",
  sessionId,
  prompt,
  ...DEV_ARGS,
  ...claudeArgs,
  "--allowedTools",
  ...ALLOWED_TOOLS,
]

// un contrôle en échec : nom de l'étape et sortie de la commande (transmise à Claude)
export interface Diagnostic {
  readonly step: string
  readonly output: string
}

export interface Verification {
  readonly ok: boolean
  readonly sessionId: string // session Claude après les éventuelles corrections
  readonly diagnostic?: Diagnostic // dernier contrôle en échec quand ok = false
}

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

// fichiers de travail de l'orchestrateur, jamais commités
const cleanWorktree = (worktree: string) => {
  const planFile = path.join(worktree, ".ia-plan.md")
  if (existsSync(planFile)) {
    unlinkSync(planFile)
  }
  rmSync(path.join(worktree, TICKET_DIR), { recursive: true, force: true })
}

// mêmes contrôles que la phase lint/typage de « next build » : Prettier puis ESLint --fix sur les fichiers
// touchés (le build échoue sur la règle prettier/prettier), tsc, puis ESLint sur tout src ;
// renvoie le premier contrôle en échec (None = prêt à commiter)
export const checkWorktree = (worktree: string) =>
  Effect.gen(function* () {
    const { baseBranch } = yield* AppConfig
    const { exec } = yield* Shell
    cleanWorktree(worktree)

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
    const checks: Array<{ step: string; run: Effect.Effect<string, ShellError> }> = [
      ...(lintFiles.length > 0
        ? [
            {
              step: "yarn eslint --fix (fichiers du ticket)",
              run: exec("yarn", ["eslint", "--fix", ...lintFiles], worktree),
            },
          ]
        : []),
      { step: "yarn tsc", run: exec("yarn", ["tsc", "--skipLibCheck", "--noEmit"], worktree) },
      { step: "yarn eslint (src)", run: exec("yarn", ["eslint", "src/**/*.{js,jsx,ts,tsx}"], worktree) },
    ]
    for (const check of checks) {
      console.log(`  ${check.step}…`)
      const failure = yield* check.run.pipe(
        Effect.as(Option.none<Diagnostic>()),
        Effect.catch((error) =>
          Effect.succeed(Option.some<Diagnostic>({ step: check.step, output: error.output || error.message })),
        ),
      )
      if (Option.isSome(failure)) {
        return failure
      }
    }
    return Option.none<Diagnostic>()
  })

// garde-fous avec correction par Claude : la sortie d'un contrôle en échec lui est transmise dans la session
// du ticket (🛠️ sur la carte), IA_FIX_ATTEMPTS fois max
export const verifyAndFix = (
  card: TrelloCard,
  worktree: string,
  sessionId: string,
  claudeArgs: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const { fixAttempts } = yield* AppConfig
    const trello = yield* TrelloClient
    const claude = yield* ClaudeRunner
    const store = yield* StateStore
    let session = sessionId
    for (let attempt = 0; ; attempt++) {
      const diagnostic = yield* checkWorktree(worktree)
      if (Option.isNone(diagnostic)) {
        const verification: Verification = { ok: true, sessionId: session }
        return verification
      }
      if (attempt >= fixAttempts) {
        const verification: Verification = { ok: false, sessionId: session, diagnostic: diagnostic.value }
        return verification
      }
      const attemptNumber = attempt + 1
      console.log(
        `  ${diagnostic.value.step} en échec : correction par Claude (tentative ${attemptNumber}/${fixAttempts})…`,
      )
      yield* trello.addComment(
        card.id,
        truncate(
          `🛠️ Garde-fou « ${diagnostic.value.step} » en échec, correction en cours (tentative ${attemptNumber}/${fixAttempts}) :\n\`\`\`\n${diagnostic.value.output}\n\`\`\``,
        ),
      )
      const output = yield* claude.run(
        implementArgs(
          session,
          fixPrompt(
            card,
            attemptNumber,
            fixAttempts,
            `le garde-fou « ${diagnostic.value.step} » a échoué avant commit (sortie ci-dessous)`,
            diagnostic.value.output,
          ),
          claudeArgs,
        ),
        worktree,
      )
      session = output.session_id
      yield* store.save(card.idShort, { sessionId: session })
    }
  })

// modifications en attente dans le worktree (`git status --porcelain`, vide = rien à commiter)
export const pendingChanges = (worktree: string) =>
  Effect.gen(function* () {
    const { exec } = yield* Shell
    return yield* exec("git", ["status", "--porcelain"], worktree)
  })

// commit de tout le worktree puis push de la branche ; renvoie le sha poussé
export const commitAndPush = (worktree: string, branch: string, message: string) =>
  Effect.gen(function* () {
    const { exec } = yield* Shell
    yield* exec("git", ["add", "-A"], worktree)
    yield* exec("git", ["commit", "-m", message], worktree)
    const sha = yield* exec("git", ["rev-parse", "HEAD"], worktree)
    yield* exec("git", ["push", "-u", "origin", branch], worktree)
    return sha
  })
