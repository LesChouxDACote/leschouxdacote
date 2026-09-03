import { spawn } from "child_process"
import { Context, Duration, Effect, Layer, Option, Schema as Sc } from "effect"
import { ClaudeError } from "./errors"
import { ClaudeOutput, TrelloCardDetails } from "./schemas"

export const CLAUDE_TIMEOUT = Duration.minutes(45)
export const CHAT_TIMEOUT = Duration.minutes(10)

// étiquette Trello → modèle Claude du ticket (prime sur ANTHROPIC_MODEL, cf. --model du CLI)
const MODEL_LABELS: Record<string, string> = {
  opus: "opus",
  sonnet: "sonnet",
  haiku: "haiku",
  fable: "claude-fable-5", // pas d'alias CLI, et nécessite un compte y ayant accès
}
const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"]

// étiquettes de la carte → arguments claude optionnels : modèle (opus/sonnet/haiku/fable ou
// model:<id>) et effort (effort:low|medium|high|xhigh|max) ; sans étiquette, défauts du CLI
export const claudeArgsFor = (details: TrelloCardDetails) => {
  const args: string[] = []
  for (const label of details.labels) {
    const name = (label.name || "").trim().toLowerCase()
    const model = MODEL_LABELS[name] || (name.startsWith("model:") ? name.slice("model:".length).trim() : undefined)
    if (model && !args.includes("--model")) {
      console.log(`  Modèle demandé par étiquette : ${model}`)
      args.push("--model", model)
    }
    if (name.startsWith("effort:") && !args.includes("--effort")) {
      const level = name.slice("effort:".length).trim()
      if (EFFORT_LEVELS.includes(level)) {
        console.log(`  Effort demandé par étiquette : ${level}`)
        args.push("--effort", level)
      } else {
        console.log(`  Étiquette effort ignorée (niveau inconnu : « ${level} », attendu ${EFFORT_LEVELS.join("/")})`)
      }
    }
  }
  return args
}

export interface ClaudeRunnerShape {
  // `claude -p … --output-format json` dans cwd ; échec = code ≠ 0, sortie non JSON, is_error ou timeout
  readonly run: (
    args: ReadonlyArray<string>,
    cwd: string,
    timeout?: Duration.Input,
  ) => Effect.Effect<ClaudeOutput, ClaudeError>
  // première session d'un ticket : UUID déterministe, avec repli en session anonyme s'il est déjà pris
  readonly runNewSession: (
    args: ReadonlyArray<string>,
    sessionId: string,
    cwd: string,
    timeout?: Duration.Input,
  ) => Effect.Effect<ClaudeOutput, ClaudeError>
}

export class ClaudeRunner extends Context.Service<ClaudeRunner, ClaudeRunnerShape>()("ClaudeRunner") {}

const parseOutput = (stdout: string): ClaudeOutput | undefined => {
  try {
    return Option.getOrUndefined(Sc.decodeUnknownOption(ClaudeOutput)(JSON.parse(stdout)))
  } catch {
    return undefined // sortie non JSON : traitée comme un échec par l'appelant
  }
}

const spawnClaude = (args: ReadonlyArray<string>, cwd: string) =>
  Effect.callback<ClaudeOutput, ClaudeError>((resume) => {
    const child = spawn("claude", [...args], { cwd, stdio: ["ignore", "pipe", "inherit"] })
    let stdout = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.on("error", (error) => resume(Effect.fail(new ClaudeError({ message: error.message }))))
    child.on("close", (code) => {
      const output = parseOutput(stdout)
      if (code !== 0 || !output || output.is_error) {
        resume(
          Effect.fail(
            new ClaudeError({
              message: `claude : échec (code ${code}) : ${(output?.result || stdout || "aucune sortie").slice(-2000)}`,
            }),
          ),
        )
      } else {
        console.log(`  Modèle(s) Claude : ${Object.keys(output.modelUsage ?? {}).join(", ") || "non renseigné"}`)
        resume(Effect.succeed(output))
      }
    })
    // interruption (timeout, arrêt du watcher) : pas de claude orphelin
    return Effect.sync(() => {
      child.kill()
    })
  })

const run: ClaudeRunnerShape["run"] = (args, cwd, timeout = CLAUDE_TIMEOUT) => {
  const duration = Duration.fromInputUnsafe(timeout)
  return spawnClaude(args, cwd).pipe(
    Effect.timeoutOrElse({
      duration,
      orElse: () =>
        Effect.fail(
          new ClaudeError({
            message: `claude : temps d'exécution dépassé (${Math.round(Duration.toMillis(duration) / 60000)} min)`,
          }),
        ),
    }),
  )
}

const runNewSession: ClaudeRunnerShape["runNewSession"] = (args, sessionId, cwd, timeout) =>
  run([...args, "--session-id", sessionId], cwd, timeout).pipe(
    Effect.catch((error) =>
      Effect.sync(() => console.error("  --session-id indisponible, session anonyme :", error)).pipe(
        Effect.andThen(run(args, cwd, timeout)),
      ),
    ),
  )

export const ClaudeRunnerLive = Layer.succeed(ClaudeRunner, { run, runNewSession })
