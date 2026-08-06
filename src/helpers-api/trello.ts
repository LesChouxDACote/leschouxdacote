import { writeFileSync } from "fs"

const BASE_URL = "https://api.trello.com/1"

export interface TrelloList {
  id: string
  name: string
}

export interface TrelloCard {
  id: string
  idShort: number
  name: string
  desc: string
  shortUrl: string
}

export interface TrelloMember {
  id: string
  username: string
  fullName?: string
}

export interface TrelloComment {
  id: string
  date: string
  memberId: string
  memberName: string
  text: string
}

export interface TrelloChecklistItem {
  name: string
  state: "complete" | "incomplete"
}

export interface TrelloChecklist {
  name: string
  checkItems: TrelloChecklistItem[]
}

export interface TrelloAttachment {
  id: string
  name: string
  url: string
  bytes: number | null // null pour les liens, renseigné pour les fichiers uploadés sur Trello
  mimeType?: string
}

export interface TrelloCardDetails extends TrelloCard {
  due: string | null
  labels: { name: string; color?: string }[]
  checklists: TrelloChecklist[]
  attachments: TrelloAttachment[]
  members: { username: string; fullName?: string }[]
}

interface TrelloCommentAction {
  id: string
  date: string
  idMemberCreator: string
  memberCreator?: { fullName?: string; username?: string }
  data: { text: string }
}

const request = async <T>(method: string, path: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(BASE_URL + path)
  url.searchParams.set("key", process.env.TRELLO_API_KEY as string)
  url.searchParams.set("token", process.env.TRELLO_TOKEN as string)
  for (const key in params) {
    url.searchParams.set(key, params[key])
  }

  const response = await fetch(url, { method })
  if (!response.ok) {
    throw new Error(`Trello ${method} ${path} : ${response.status} ${await response.text()}`)
  }

  return response.json() as Promise<T>
}

export const getMe = () => request<TrelloMember>("GET", "/members/me", { fields: "id,username,fullName" })

export const getLists = (boardId: string) => request<TrelloList[]>("GET", `/boards/${boardId}/lists`)

export const getCards = (listId: string) =>
  request<TrelloCard[]>("GET", `/lists/${listId}/cards`, { fields: "id,idShort,name,desc,shortUrl" })

// carte complète : description, échéance, labels, checklists, pièces jointes, membres
export const getCardDetails = (cardId: string) =>
  request<TrelloCardDetails>("GET", `/cards/${cardId}`, {
    fields: "id,idShort,name,desc,shortUrl,due,labels",
    checklists: "all",
    attachments: "true",
    members: "true",
    member_fields: "username,fullName",
  })

// commentaires dans l'ordre chronologique (Trello les renvoie du plus récent au plus ancien)
export const getComments = async (cardId: string): Promise<TrelloComment[]> => {
  const actions = await request<TrelloCommentAction[]>("GET", `/cards/${cardId}/actions`, {
    filter: "commentCard",
    limit: "50",
  })
  return actions
    .map((action) => ({
      id: action.id,
      date: action.date,
      memberId: action.idMemberCreator,
      memberName: action.memberCreator?.fullName || action.memberCreator?.username || "inconnu",
      text: action.data.text,
    }))
    .reverse()
}

// les fichiers uploadés sur Trello exigent une authentification par header (pas en query string)
export const downloadAttachment = async (url: string, destPath: string) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `OAuth oauth_consumer_key="${process.env.TRELLO_API_KEY}", oauth_token="${process.env.TRELLO_TOKEN}"`,
    },
  })
  if (!response.ok) {
    throw new Error(`Trello téléchargement ${url} : ${response.status}`)
  }
  writeFileSync(destPath, Buffer.from(await response.arrayBuffer()))
}

export const moveCard = (cardId: string, listId: string) =>
  request<unknown>("PUT", `/cards/${cardId}`, { idList: listId })

export const addComment = async (cardId: string, text: string) => {
  const result = await request<unknown>("POST", `/cards/${cardId}/actions/comments`, { text })
  console.log(`  Commentaire Trello ajouté : ${text.split("\n")[0].slice(0, 80)}`)
  return result
}
