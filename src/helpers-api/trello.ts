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

export const getLists = (boardId: string) => request<TrelloList[]>("GET", `/boards/${boardId}/lists`)

export const getCards = (listId: string) =>
  request<TrelloCard[]>("GET", `/lists/${listId}/cards`, { fields: "id,idShort,name,desc,shortUrl" })

export const moveCard = (cardId: string, listId: string) =>
  request<unknown>("PUT", `/cards/${cardId}`, { idList: listId })

export const addComment = (cardId: string, text: string) =>
  request<unknown>("POST", `/cards/${cardId}/actions/comments`, { text })
