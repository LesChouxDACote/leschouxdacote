import { Context, Effect, Layer, Semaphore } from "effect"
import { existsSync, rmSync } from "fs"
import path from "path"
import { AppConfig } from "./config"
import { ShellError } from "./errors"
import { log } from "./log"
import { Shell } from "./shell"

export interface WorktreePaths {
  readonly branch: string
  readonly worktree: string
}

export interface GitShape {
  // worktree partagé et détaché : contexte code des discussions de cadrage
  readonly atelierWorktree: string
  // les voies cadrage et dev tournent en parallèle : sérialise les commandes git qui touchent
  // l'état partagé du dépôt (fetch des mêmes refs, worktree add/remove/prune). Verrou NON réentrant.
  readonly locked: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  // version sans verrou, à n'appeler que depuis un bloc déjà sous `locked`
  readonly removeWorktreeFiles: (paths: WorktreePaths) => Effect.Effect<void, ShellError>
  readonly removeWorktree: (paths: WorktreePaths) => Effect.Effect<void, ShellError>
  // (re)met le worktree de cadrage sur la tête d'une branche : celle du ticket quand elle
  // existe sur origin (le cadrage doit voir le travail déjà livré), sinon la branche de base
  readonly refreshAtelierWorktree: (branch?: string) => Effect.Effect<void, ShellError>
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

    const recreateAtelier = (ref: string) =>
      Effect.gen(function* () {
        yield* exec("git", ["worktree", "remove", "--force", atelierWorktree]).pipe(
          Effect.catch(() => removeDir(atelierWorktree)),
        )
        yield* Effect.ignore(exec("git", ["worktree", "prune"]))
        yield* exec("git", ["worktree", "add", "--detach", atelierWorktree, ref])
      })

    const refreshAtelierWorktree: GitShape["refreshAtelierWorktree"] = (branch) =>
      locked(
        Effect.gen(function* () {
          yield* exec("git", ["fetch", "origin", baseBranch])
          let ref = `origin/${baseBranch}`
          if (branch) {
            // la branche du ticket peut ne pas (plus) exister sur origin : repli sur la base
            ref = yield* exec("git", ["fetch", "origin", branch]).pipe(
              Effect.as(`origin/${branch}`),
              Effect.catch(() =>
                Effect.sync(() => {
                  log(`  Branche ${branch} introuvable sur origin, cadrage sur ${baseBranch}`)
                }).pipe(Effect.as(`origin/${baseBranch}`)),
              ),
            )
          }
          // --detach : la branche est peut-être déjà occupée par le worktree de dev du ticket
          if (existsSync(atelierWorktree)) {
            yield* exec("git", ["checkout", "--detach", ref], atelierWorktree).pipe(
              Effect.catch(() => recreateAtelier(ref)),
            )
          } else {
            yield* recreateAtelier(ref)
          }
        }),
      )

    return { atelierWorktree, locked, removeWorktreeFiles, removeWorktree, refreshAtelierWorktree }
  }),
)
