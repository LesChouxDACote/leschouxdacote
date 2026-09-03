import { Context, Effect, Layer, Schema as Sc } from "effect"
import { writeFileSync } from "fs"
import { AppConfig } from "./config"
import { TrelloError } from "./errors"
import { TrelloCard, TrelloCardDetails, TrelloComment, TrelloCommentAction, TrelloList, TrelloMember } from "./schemas"

const BASE_URL = "https://api.trello.com/1"

export interface TrelloClientShape {
  readonly getMe: Effect.Effect<TrelloMember, TrelloError>
  readonly getLists: (boardId: string) => Effect.Effect<ReadonlyArray<TrelloList>, TrelloError>
  readonly getCards: (listId: string) => Effect.Effect<ReadonlyArray<TrelloCard>, TrelloError>
  // carte complète : description, échéance, labels, checklists, pièces jointes, membres
  readonly getCardDetails: (cardId: string) => Effect.Effect<TrelloCardDetails, TrelloError>
  // commentaires dans l'ordre chronologique (Trello les renvoie du plus récent au plus ancien)
  readonly getComments: (cardId: string) => Effect.Effect<ReadonlyArray<TrelloComment>, TrelloError>
  readonly downloadAttachment: (url: string, destPath: string) => Effect.Effect<void, TrelloError>
  readonly moveCard: (cardId: string, listId: string) => Effect.Effect<void, TrelloError>
  readonly addComment: (cardId: string, text: string) => Effect.Effect<void, TrelloError>
}

export class TrelloClient extends Context.Service<TrelloClient, TrelloClientShape>()("TrelloClient") {}

export const TrelloClientLive = Layer.effect(
  TrelloClient,
  Effect.gen(function* () {
    const config = yield* AppConfig

    const request = (method: string, path: string, params: Record<string, string> = {}) =>
      Effect.gen(function* () {
        const url = new URL(BASE_URL + path)
        url.searchParams.set("key", config.trelloApiKey)
        url.searchParams.set("token", config.trelloToken)
        // les paramètres des écritures vont dans le corps : un commentaire long dans l'URL provoque un 414
        const body = method === "GET" ? undefined : new URLSearchParams(params)
        if (!body) {
          for (const key in params) {
            url.searchParams.set(key, params[key])
          }
        }
        const response = yield* Effect.tryPromise({
          try: () => fetch(url, { method, body }),
          catch: (cause) => new TrelloError({ message: `Trello ${method} ${path} : ${String(cause)}`, cause }),
        })
        if (!response.ok) {
          const body = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => new TrelloError({ message: `Trello ${method} ${path} : ${response.status}` }),
          })
          return yield* Effect.fail(
            new TrelloError({ message: `Trello ${method} ${path} : ${response.status} ${body.slice(0, 300)}` }),
          )
        }
        return yield* Effect.tryPromise({
          try: () => response.json() as Promise<unknown>,
          catch: (cause) => new TrelloError({ message: `Trello ${method} ${path} : réponse JSON invalide`, cause }),
        })
      })

    const decoded = <S extends Sc.Top>(schema: S, method: string, path: string, params?: Record<string, string>) =>
      request(method, path, params).pipe(
        Effect.flatMap((json) =>
          Sc.decodeUnknownEffect(schema)(json).pipe(
            Effect.mapError(
              (cause) =>
                new TrelloError({ message: `Trello ${method} ${path} : réponse inattendue (${cause.message})`, cause }),
            ),
          ),
        ),
      )

    const client: TrelloClientShape = {
      getMe: decoded(TrelloMember, "GET", "/members/me", { fields: "id,username,fullName" }),

      getLists: (boardId) => decoded(Sc.Array(TrelloList), "GET", `/boards/${boardId}/lists`),

      getCards: (listId) =>
        decoded(Sc.Array(TrelloCard), "GET", `/lists/${listId}/cards`, { fields: "id,idShort,name,desc,shortUrl" }),

      getCardDetails: (cardId) =>
        decoded(TrelloCardDetails, "GET", `/cards/${cardId}`, {
          fields: "id,idShort,name,desc,shortUrl,due,labels",
          checklists: "all",
          attachments: "true",
          members: "true",
          member_fields: "username,fullName",
        }),

      getComments: (cardId) =>
        decoded(Sc.Array(TrelloCommentAction), "GET", `/cards/${cardId}/actions`, {
          filter: "commentCard",
          limit: "50",
        }).pipe(
          Effect.map((actions) =>
            actions
              .map((action) => ({
                id: action.id,
                date: action.date,
                memberId: action.idMemberCreator,
                memberName: action.memberCreator?.fullName || action.memberCreator?.username || "inconnu",
                text: action.data.text,
              }))
              .reverse(),
          ),
        ),

      // les fichiers uploadés sur Trello exigent une authentification par header (pas en query string)
      downloadAttachment: (url, destPath) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(url, {
                headers: {
                  Authorization: `OAuth oauth_consumer_key="${config.trelloApiKey}", oauth_token="${config.trelloToken}"`,
                },
              }),
            catch: (cause) => new TrelloError({ message: `Trello téléchargement ${url} : ${String(cause)}`, cause }),
          })
          if (!response.ok) {
            return yield* Effect.fail(new TrelloError({ message: `Trello téléchargement ${url} : ${response.status}` }))
          }
          const bytes = yield* Effect.tryPromise({
            try: () => response.arrayBuffer(),
            catch: (cause) => new TrelloError({ message: `Trello téléchargement ${url} : lecture impossible`, cause }),
          })
          yield* Effect.try({
            try: () => writeFileSync(destPath, Buffer.from(bytes)),
            catch: (cause) =>
              new TrelloError({ message: `Écriture de ${destPath} impossible : ${String(cause)}`, cause }),
          })
        }),

      moveCard: (cardId, listId) =>
        request("PUT", `/cards/${cardId}`, { idList: listId }).pipe(Effect.map(() => undefined)),

      addComment: (cardId, text) =>
        request("POST", `/cards/${cardId}/actions/comments`, { text }).pipe(
          Effect.map(() => {
            console.log(`  Commentaire Trello ajouté : ${text.split("\n")[0].slice(0, 80)}`)
          }),
        ),
    }
    return client
  }),
)
