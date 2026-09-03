// Adaptateur transitoire : expose les services Effect sous forme de fonctions Promise/synchrones
// pour le script historique, le temps de migrer l'orchestration (phases 2 et 3).
import { Effect, Layer } from "effect"
import { AppConfig, AppConfigLive } from "./config"
import type { TicketState } from "./schemas"
import { StateStore, StateStoreLive } from "./state"
import { TrelloClient, TrelloClientLive } from "./trello"

export const AppLayer = Layer.mergeAll(TrelloClientLive, StateStoreLive).pipe(Layer.provideMerge(AppConfigLive))

const servicesEffect = Effect.all({ trello: TrelloClient, state: StateStore, config: AppConfig })
type Services = Effect.Success<typeof servicesEffect>

let services: Services | undefined

// à appeler une fois au démarrage (résout la configuration et construit les services)
export const initServices = async () => {
  if (!services) {
    services = await Effect.runPromise(servicesEffect.pipe(Effect.provide(AppLayer)))
  }
  return services
}

const current = () => {
  if (!services) {
    throw new Error("initServices() doit être appelé avant d'utiliser les services")
  }
  return services
}

export const getMe = () => Effect.runPromise(current().trello.getMe)
export const getLists = (boardId: string) => Effect.runPromise(current().trello.getLists(boardId))
export const getCards = (listId: string) => Effect.runPromise(current().trello.getCards(listId))
export const getCardDetails = (cardId: string) => Effect.runPromise(current().trello.getCardDetails(cardId))
export const getComments = (cardId: string) => Effect.runPromise(current().trello.getComments(cardId))
export const downloadAttachment = (url: string, destPath: string) =>
  Effect.runPromise(current().trello.downloadAttachment(url, destPath))
export const moveCard = (cardId: string, listId: string) => Effect.runPromise(current().trello.moveCard(cardId, listId))
export const addComment = (cardId: string, text: string) => Effect.runPromise(current().trello.addComment(cardId, text))

export const readState = () => Effect.runSync(current().state.read)
export const saveTicketState = (idShort: number, ticket: Partial<TicketState>) =>
  Effect.runSync(current().state.save(idShort, ticket))
