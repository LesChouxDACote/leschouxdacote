import type { Hit, SearchResponse } from "@algolia/client-search"
import { algoliasearch } from "algoliasearch"

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string,
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY as string,
)

// algoliasearch v5 a retiré initIndex() : on émule l'API index de la v4
export interface SearchIndex {
  search<T>(query: string, options?: Record<string, any>): Promise<{ hits: Hit<T>[] }>
  saveObject(object: Record<string, any>): Promise<unknown>
  deleteObject(objectID: string): Promise<unknown>
  partialUpdateObject(object: Record<string, any> & { objectID: string }): Promise<unknown>
  partialUpdateObjects(objects: Record<string, any>[]): Promise<unknown>
  setSettings(settings: Record<string, any>): Promise<unknown>
}

const initIndex = (indexName: string): SearchIndex => ({
  async search<T>(query: string, options?: Record<string, any>) {
    const { results } = await client.search<T>({
      requests: [{ indexName, query, params: options as any }],
    })
    return { hits: (results[0] as SearchResponse<T> | undefined)?.hits ?? [] }
  },
  saveObject: (object) => client.saveObject({ indexName, body: object }),
  deleteObject: (objectID) => client.deleteObject({ indexName, objectID }),
  partialUpdateObject: (object) => {
    const { objectID, ...attributes } = object
    return client.partialUpdateObject({ indexName, objectID, attributesToUpdate: attributes })
  },
  partialUpdateObjects: (objects) => client.partialUpdateObjects({ indexName, objects }),
  setSettings: (settings) => client.setSettings({ indexName, indexSettings: settings as any }),
})

export const productsIndex = initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX as string)

export const tagsIndex = initIndex(process.env.NEXT_PUBLIC_ALGOLIA_TAGS as string)
