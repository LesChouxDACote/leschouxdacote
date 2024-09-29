import algoliasearch from "algoliasearch"

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string,
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY as string,
)

export const productsIndex = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX as string)

export const tagsIndex = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_TAGS as string)
