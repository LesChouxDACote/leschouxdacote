import { execFile } from "child_process"
import { Context, Effect, Layer } from "effect"
import { AppConfig } from "./config"
import { ShellError } from "./errors"

const OUTPUT_LIMIT = 6000

export interface ShellShape {
  // stdout (sans blancs terminaux) ; en cas d'échec, ShellError « commande args : stderr » (ou la fin de stdout
  // quand stderr est vide : tsc et ESLint y écrivent leurs erreurs), avec la fin de la sortie complète dans `output`.
  // `env` s'ajoute à l'environnement du watcher.
  readonly exec: (
    command: string,
    args: ReadonlyArray<string>,
    cwd?: string,
    env?: Record<string, string>,
  ) => Effect.Effect<string, ShellError>
}

export class Shell extends Context.Service<Shell, ShellShape>()("Shell") {}

export const ShellLive = Layer.effect(
  Shell,
  Effect.gen(function* () {
    const { repoRoot } = yield* AppConfig

    const exec: ShellShape["exec"] = (command, args, cwd = repoRoot, env) =>
      Effect.callback<string, ShellError>((resume) => {
        const child = execFile(
          command,
          [...args],
          { cwd, env: env ? { ...process.env, ...env } : undefined, maxBuffer: 16 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              resume(
                Effect.fail(
                  new ShellError({
                    message: `${command} ${args.join(" ")} : ${stderr.trim() || stdout.trim().slice(-2000) || error.message}`,
                    output: `${stdout}\n${stderr}`.trim().slice(-OUTPUT_LIMIT),
                  }),
                ),
              )
            } else {
              resume(Effect.succeed(stdout.trim()))
            }
          },
        )
        // interruption (timeout, arrêt) : le process enfant ne doit pas survivre à la fibre
        return Effect.sync(() => {
          child.kill()
        })
      })

    return { exec }
  }),
)
