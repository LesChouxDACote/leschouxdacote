// Garde-fous et livraison d'un worktree après un passage de Claude : typage, formatage, commit, push
import { Effect } from "effect"
import { existsSync, rmSync, unlinkSync } from "fs"
import path from "path"
import { AppConfig } from "./config"
import { Shell } from "./shell"
import { TICKET_DIR } from "./ticket"

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

// garde-fous typage + formatage : tsc, nettoyage des fichiers de travail, Prettier et ESLint --fix sur
// tout ce que le ticket a touché ; renvoie `git status --porcelain` (vide = rien à commiter)
export const formatWorktree = (worktree: string) =>
  Effect.gen(function* () {
    const { baseBranch } = yield* AppConfig
    const { exec } = yield* Shell

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
