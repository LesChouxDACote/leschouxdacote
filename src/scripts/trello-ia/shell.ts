import { execFile } from "child_process"
import { Context, Effect, Layer } from "effect"
import { AppConfig } from "./config"
import { ShellError } from "./errors"

export interface ShellShape {
  // stdout (sans blancs terminaux) ; en cas d'échec, ShellError « commande args : stderr »
  readonly exec: (command: string, args: ReadonlyArray<string>, cwd?: string) => Effect.Effect<string, ShellError>
}

export class Shell extends Context.Service<Shell, ShellShape>()("Shell") {}

export const ShellLive = Layer.effect(
  Shell,
  Effect.gen(function* () {
    const { repoRoot } = yield* AppConfig

    const exec: ShellShape["exec"] = (command, args, cwd = repoRoot) =>
      Effect.callback<string, ShellError>((resume) => {
        const child = execFile(command, [...args], { cwd, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            resume(
              Effect.fail(
                new ShellError({ message: `${command} ${args.join(" ")} : ${stderr.trim() || error.message}` }),
              ),
            )
          } else {
            resume(Effect.succeed(stdout.trim()))
          }
        })
        // interruption (timeout, arrêt) : le process enfant ne doit pas survivre à la fibre
        return Effect.sync(() => {
          child.kill()
        })
      })

    return { exec }
  }),
)
