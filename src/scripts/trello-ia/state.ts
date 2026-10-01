import { Context, Effect, Layer, Schema as Sc } from "effect"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { AppConfig } from "./config"
import { StateError } from "./errors"
import { StateFile, TicketState } from "./schemas"

export interface StateStoreShape {
  readonly read: Effect.Effect<StateFile, StateError>
  // fusion par ticket : les champs non fournis sont conservés (sessions dev et cadrage cohabitent)
  readonly save: (idShort: number, ticket: Partial<TicketState>) => Effect.Effect<void, StateError>
}

export class StateStore extends Context.Service<StateStore, StateStoreShape>()("StateStore") {}

export const StateStoreLive = Layer.effect(
  StateStore,
  Effect.gen(function* () {
    const { stateFile } = yield* AppConfig

    const read: StateStoreShape["read"] = Effect.try({
      try: (): unknown => (existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {}),
      catch: (cause) => new StateError({ message: `Lecture de ${stateFile} impossible : ${String(cause)}`, cause }),
    }).pipe(
      Effect.flatMap((raw) =>
        Sc.decodeUnknownEffect(StateFile)(raw).pipe(
          Effect.mapError(
            (cause) => new StateError({ message: `Contenu de ${stateFile} invalide : ${cause.message}`, cause }),
          ),
        ),
      ),
    )

    const save: StateStoreShape["save"] = (idShort, ticket) =>
      read.pipe(
        Effect.flatMap((state) =>
          Effect.try({
            try: () => {
              const next = { ...state, [idShort]: { ...state[idShort], ...ticket } }
              writeFileSync(stateFile, JSON.stringify(next, null, 2))
            },
            catch: (cause) =>
              new StateError({ message: `Écriture de ${stateFile} impossible : ${String(cause)}`, cause }),
          }),
        ),
      )

    return { read, save }
  }),
)
