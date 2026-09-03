import { Context, Effect, Layer, Option, Schedule } from "effect"
import { AppConfig } from "./config"
import { TrelloError } from "./errors"
import { TrelloCard } from "./schemas"
import { TrelloClient } from "./trello"

export interface PreviewShape {
  // PREVIEW_URL_TEMPLATE (ex. https://{{pr_id}}.choux.ilieff.fr, même placeholder que Coolify)
  readonly urlFor: (prUrl: string | undefined) => string | undefined
  readonly lineFor: (prUrl: string | undefined, label?: string) => string
  // buildId Next.js embarqué dans la page (__NEXT_DATA__) : identifie le build réellement servi
  readonly buildId: (url: string | undefined) => Effect.Effect<string | undefined>
  // pingue le preview jusqu'à ce qu'il réponde — et, sur une itération, jusqu'à ce qu'il serve un
  // build DIFFÉRENT de l'ancien (l'ancienne version reste en ligne pendant le rebuild Coolify).
  // À lancer en fibre détachée : le watcher continue de traiter les tickets pendant l'attente.
  readonly notifyWhenLive: (
    card: TrelloCard,
    prUrl: string,
    previousBuildId?: string,
  ) => Effect.Effect<void, TrelloError>
}

export class Preview extends Context.Service<Preview, PreviewShape>()("Preview") {}

type Probe = { readonly ok: true; readonly buildId: string | undefined } | { readonly ok: false }

// ne lève jamais : DNS/certificat/build pas encore prêts = « pas en ligne »
const probe = (url: string): Effect.Effect<Probe> =>
  Effect.promise(async (signal) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) })
      if (!response.ok) {
        return { ok: false }
      }
      return { ok: true, buildId: (await response.text()).match(/"buildId":"([^"]+)"/)?.[1] }
    } catch {
      return { ok: false }
    }
  })

export const PreviewLive = Layer.effect(
  Preview,
  Effect.gen(function* () {
    const { previewUrlTemplate } = yield* AppConfig
    const trello = yield* TrelloClient

    const urlFor: PreviewShape["urlFor"] = (prUrl) => {
      const prNumber = prUrl?.split("/").pop()
      return Option.isSome(previewUrlTemplate) && prNumber
        ? previewUrlTemplate.value.replace("{{pr_id}}", prNumber)
        : undefined
    }

    const lineFor: PreviewShape["lineFor"] = (prUrl, label = "Preview") => {
      const url = urlFor(prUrl)
      return url ? `\n${label} : ${url}` : ""
    }

    const buildId: PreviewShape["buildId"] = (url) =>
      url ? probe(url).pipe(Effect.map((result) => (result.ok ? result.buildId : undefined))) : Effect.undefined

    const notifyWhenLive: PreviewShape["notifyWhenLive"] = (card, prUrl, previousBuildId) => {
      const url = urlFor(prUrl)
      if (!url) {
        return Effect.void
      }
      // Some(buildId) dès que le preview répond avec un build « frais »
      const attempt = probe(url).pipe(
        Effect.map((result) => {
          if (!result.ok) {
            return Option.none<string | undefined>()
          }
          const isFresh = previousBuildId ? result.buildId !== undefined && result.buildId !== previousBuildId : true
          return isFresh ? Option.some(result.buildId) : Option.none<string | undefined>()
        }),
      )
      return Effect.gen(function* () {
        console.log(
          `  Ping du preview ${url} (toutes les 30 s, 15 min max${previousBuildId ? `, attente d'un build ≠ ${previousBuildId}` : ""})…`,
        )
        const fresh = yield* attempt.pipe(
          Effect.repeat({ schedule: Schedule.spaced("30 seconds"), until: Option.isSome }),
          Effect.timeoutOption("15 minutes"),
          Effect.map(Option.flatten),
        )
        if (Option.isSome(fresh)) {
          const label = previousBuildId ? "Preview mise à jour" : "Preview en ligne"
          console.log(`  ${label} : ${url} (build ${fresh.value ?? "?"})`)
          yield* trello.addComment(card.id, `🌐 ${label} : ${url}`)
        } else {
          console.log(`  Preview toujours pas ${previousBuildId ? "mise à jour" : "en ligne"} après 15 min : ${url}`)
        }
      })
    }

    return { urlFor, lineFor, buildId, notifyWhenLive }
  }),
)
