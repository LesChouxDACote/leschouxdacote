import { Effect } from "effect"
import { AppConfig } from "./config"
import { WatcherError } from "./errors"
import type { TrelloList } from "./schemas"
import { TrelloClient } from "./trello"

export interface ResolvedLists {
  readonly ready: TrelloList
  readonly wip: TrelloList
  readonly done: TrelloList
  readonly refine?: TrelloList // optionnelle : sans elle, le cadrage est désactivé
}

// retrouve les listes du board par nom (insensible à la casse)
export const resolveLists = Effect.gen(function* () {
  const config = yield* AppConfig
  const trello = yield* TrelloClient
  const lists = yield* trello.getLists(config.trelloBoardId)
  const findByName = (name: string) => lists.find(({ name: listName }) => listName.toLowerCase() === name.toLowerCase())
  const mustFind = (name: string) => {
    const list = findByName(name)
    return list
      ? Effect.succeed(list)
      : Effect.fail(new WatcherError({ message: `Liste Trello « ${name} » introuvable sur le board` }))
  }
  const refine = findByName(config.listRefine)
  if (!refine) {
    console.log(`Liste « ${config.listRefine} » absente du board : cadrage IA désactivé`)
  }
  const resolved: ResolvedLists = {
    ready: yield* mustFind(config.listReady),
    wip: yield* mustFind(config.listWip),
    done: yield* mustFind(config.listDone),
    refine,
  }
  return resolved
})
