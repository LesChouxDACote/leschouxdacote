import { Cause, Effect, Layer, Option } from "effect"
import { mkdirSync } from "fs"
import { processDiscussions } from "./atelier"
import { ClaudeRunnerLive } from "./claude"
import { AppConfig, AppConfigLive } from "./config"
import { CoolifyClient, CoolifyClientLive } from "./coolify"
import { processCard, reportFailure } from "./dev"
import { GitLive } from "./git"
import { resolveLists } from "./lists"
import { PreviewLive } from "./preview"
import { ShellLive } from "./shell"
import { StateStoreLive } from "./state"
import { TrelloClient, TrelloClientLive } from "./trello"

// les layers référencés deux fois (Shell, TrelloClient) ne sont construits qu'une fois (mémoïsation)
export const AppLayer = Layer.mergeAll(
  GitLive,
  PreviewLive,
  ClaudeRunnerLive,
  CoolifyClientLive,
  StateStoreLive,
  TrelloClientLive,
  ShellLive,
).pipe(Layer.provideMerge(Layer.mergeAll(ShellLive, TrelloClientLive)), Layer.provideMerge(AppConfigLive))

const logCause = (prefix: string) => (cause: Cause.Cause<unknown>) =>
  Effect.sync(() => console.error(prefix, Cause.squash(cause)))

export const main = Effect.gen(function* () {
  const config = yield* AppConfig
  const trello = yield* TrelloClient
  const coolify = yield* CoolifyClient
  const me = yield* trello.getMe
  const lists = yield* resolveLists
  mkdirSync(config.worktreesDir, { recursive: true })
  console.log(`Connecté à Trello : ${me.fullName || me.username}`)
  console.log(`Surveillance de la liste « ${lists.ready.name} » (toutes les ${config.pollMs / 60000} min)`)
  if (lists.refine) {
    console.log(
      `Cadrage actif sur la liste « ${lists.refine.name} » (toutes les ${config.chatPollMs / 60000} min, en parallèle du dev)`,
    )
  }
  console.log(
    Option.isSome(config.anthropicModel)
      ? `Modèle Claude forcé : ${config.anthropicModel.value}`
      : "Modèle Claude : défaut du compte (définir ANTHROPIC_MODEL pour forcer)",
  )
  console.log(
    coolify.enabled
      ? `Suivi des déploiements Coolify actif (application ${coolify.appUuid}, ${config.deployFixAttempts} correction(s) max, ${config.deployTimeoutMs / 60000} min max par déploiement)`
      : "Suivi des déploiements Coolify inactif (définir COOLIFY_API_URL, COOLIFY_API_TOKEN et COOLIFY_APP_UUID)",
  )

  // cadrage : voie indépendante, pour répondre au PO même pendant une implémentation
  const chatLoop = lists.refine
    ? processDiscussions(lists).pipe(
        Effect.catchCause(logCause("Erreur de cadrage :")),
        Effect.andThen(Effect.sleep(config.chatPollMs)),
        Effect.forever,
      )
    : Effect.void

  // développement : une carte Ready à la fois
  const pollReady = Effect.gen(function* () {
    const cards = yield* trello.getCards(lists.ready.id)
    if (cards.length > 0) {
      const card = cards[0] // un seul ticket à la fois
      yield* processCard(card, lists).pipe(Effect.catchCause((cause) => reportFailure(card, cause)))
    }
  })
  const devLoop = pollReady.pipe(
    Effect.catchCause(logCause("Erreur de polling Trello :")),
    Effect.andThen(Effect.sleep(config.pollMs)),
    Effect.forever,
  )

  yield* Effect.all([chatLoop, devLoop], { concurrency: "unbounded" })
})
