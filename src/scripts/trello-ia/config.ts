import { Config, Context, Effect, Layer, Option } from "effect"
import path from "path"
import { EnvError } from "./errors"

export interface AppConfigShape {
  readonly trelloApiKey: string
  readonly trelloToken: string
  readonly trelloBoardId: string
  readonly listReady: string
  readonly listWip: string
  readonly listDone: string
  readonly listRefine: string
  readonly pollMs: number
  readonly chatPollMs: number
  readonly baseBranch: string // branche de départ des tickets et cible des PR
  readonly repoRoot: string
  readonly worktreesDir: string
  readonly stateFile: string
  readonly previewUrlTemplate: Option.Option<string> // ex. https://{{pr_id}}.choux.ilieff.fr
  readonly anthropicModel: Option.Option<string>
}

export class AppConfig extends Context.Service<AppConfig, AppConfigShape>()("AppConfig") {}

// sémantique de l'existant (`process.env.X || défaut`) : une variable vide compte comme absente
const optional = (name: string) =>
  Config.option(Config.string(name)).pipe(Config.map(Option.filter((value) => value.length > 0)))

const withFallback = (name: string, fallback: string) =>
  optional(name).pipe(Config.map(Option.getOrElse(() => fallback)))

const required = (name: string) =>
  optional(name).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new EnvError({ message: `Variable d'environnement manquante : ${name}` })),
        onSome: Effect.succeed,
      }),
    ),
  )

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const repoRoot = process.cwd()
    const trelloApiKey = yield* required("TRELLO_API_KEY")
    const trelloToken = yield* required("TRELLO_TOKEN")
    const trelloBoardId = yield* required("TRELLO_BOARD_ID")
    const pollMinutes = yield* withFallback("TRELLO_POLL_MINUTES", "3")
    const chatPollMinutes = yield* withFallback("TRELLO_CHAT_POLL_MINUTES", "1")
    return {
      trelloApiKey,
      trelloToken,
      trelloBoardId,
      listReady: yield* withFallback("TRELLO_LIST_READY", "Ready IA"),
      listWip: yield* withFallback("TRELLO_LIST_WIP", "IA en cours"),
      listDone: yield* withFallback("TRELLO_LIST_DONE", "IA terminé"),
      listRefine: yield* withFallback("TRELLO_LIST_REFINE", "Atelier IA"),
      pollMs: Number(pollMinutes) * 60 * 1000,
      chatPollMs: Number(chatPollMinutes) * 60 * 1000,
      baseBranch: yield* withFallback("IA_BASE_BRANCH", "develop"),
      repoRoot,
      // surchargés en Docker pour pointer vers le volume persistant (voir docker-compose.yml)
      worktreesDir: yield* withFallback("IA_WORKTREES_DIR", path.resolve(repoRoot, "..", ".ia-worktrees")),
      stateFile: yield* withFallback("IA_STATE_FILE", path.join(repoRoot, ".ia-sessions.json")),
      previewUrlTemplate: yield* optional("PREVIEW_URL_TEMPLATE"),
      anthropicModel: yield* optional("ANTHROPIC_MODEL"),
    }
  }),
)
