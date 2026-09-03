import { Context, Effect, Layer, Semaphore } from "effect"
import { existsSync, rmSync } from "fs"
import path from "path"
import { AppConfig } from "./config"
import { ShellError } from "./errors"
import { Shell } from "./shell"

export interface WorktreePaths {
  readonly branch: string
  readonly worktree: string
}

export interface GitShape {
  // worktree partagé, détaché sur la branche de base : contexte code des discussions de cadrage
  readonly atelierWorktree: string
  // les voies cadrage et dev tournent en parallèle : sérialise les commandes git qui touchent
  // l'état partagé du dépôt (fetch des mêmes refs, worktree add/remove/prune). Verrou NON réentrant.
  readonly locked: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  // version sans verrou, à n'appeler que depuis un bloc déjà sous `locked`
  readonly removeWorktreeFiles: (paths: WorktreePaths) => Effect.Effect<void, ShellError>
  readonly removeWorktree: (paths: WorktreePaths) => Effect.Effect<void, ShellError>
  // (re)met le worktree de cadrage sur la tête de la branche de base
  readonly refreshAtelierWorktree: Effect.Effect<void, ShellError>
}

export class Git extends Context.Service<Git, GitShape>()("Git") {}

export const GitLive = Layer.effect(
  Git,
  Effect.gen(function* () {
    const { baseBranch, worktreesDir } = yield* AppConfig
    const { exec } = yield* Shell
    const semaphore = yield* Semaphore.make(1)
    const atelierWorktree = path.join(worktreesDir, "_atelier")

    const locked: GitShape["locked"] = (effect) => Semaphore.withPermits(semaphore, 1)(effect)

    const removeDir = (dir: string) =>
      Effect.try({
        try: () => rmSync(dir, { recursive: true, force: true }),
        catch: (cause) => new ShellError({ message: cause instanceof Error ? cause.message : String(cause) }),
      })

    const removeWorktreeFiles: GitShape["removeWorktreeFiles"] = ({ branch, worktree }) =>
      Effect.gen(function* () {
        if (existsSync(worktree)) {
          yield* exec("git", ["worktree", "remove", "--force", worktree]).pipe(Effect.catch(() => removeDir(worktree)))
        }
        yield* Effect.ignore(exec("git", ["worktree", "prune"]))
        yield* Effect.ignore(exec("git", ["branch", "-D", branch])) // la branche distante n'est pas touchée
      })

    const removeWorktree: GitShape["removeWorktree"] = (paths) => locked(removeWorktreeFiles(paths))

    const recreateAtelier = Effect.gen(function* () {
      yield* exec("git", ["worktree", "remove", "--force", atelierWorktree]).pipe(
        Effect.catch(() => removeDir(atelierWorktree)),
      )
      yield* Effect.ignore(exec("git", ["worktree", "prune"]))
      yield* exec("git", ["worktree", "add", "--detach", atelierWorktree, `origin/${baseBranch}`])
    })

    const refreshAtelierWorktree: GitShape["refreshAtelierWorktree"] = locked(
      Effect.gen(function* () {
        yield* exec("git", ["fetch", "origin", baseBranch])
        if (existsSync(atelierWorktree)) {
          yield* exec("git", ["checkout", "--detach", `origin/${baseBranch}`], atelierWorktree).pipe(
            Effect.catch(() => recreateAtelier),
          )
        } else {
          yield* recreateAtelier
        }
      }),
    )

    return { atelierWorktree, locked, removeWorktreeFiles, removeWorktree, refreshAtelierWorktree }
  }),
)
