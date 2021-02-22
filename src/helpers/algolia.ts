import algoliasearch from "algoliasearch"

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string,
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY as string
)
const algolia = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX as string)

export default algolia