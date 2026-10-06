import { GetServerSideProps } from "next"
import { getServerSideSitemapLegacy, ISitemapField } from "next-sitemap"
import { SSR_CACHE_HEADER } from "src/constants"
import { firestore, getObject } from "src/helpers-api/firebase"
import type { Producer, Product } from "src/types/model"

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const producersSnapshot = await firestore.collection("users").get()
  const productsSnapshot = await firestore.collection("products").get()

  const URL = process.env.NEXT_PUBLIC_URL

  const fields: ISitemapField[] = [
    {
      loc: URL + "/",
      changefreq: "weekly",
      priority: 0.5,
    },
    {
      loc: URL + "/recherche",
      changefreq: "daily",
      priority: 0.3,
    },
    {
      loc: URL + "/connexion",
      changefreq: "weekly",
      priority: 0.2,
    },
    {
      loc: URL + "/inscription",
      changefreq: "weekly",
      priority: 0.2,
    },
  ]

  productsSnapshot.forEach((doc) => {
    const product = getObject(doc) as Product
    fields.push({
      loc: URL + "/annonce/" + doc.id,
      changefreq: "daily",
      lastmod: new Date(product.updated || product.created).toISOString(),
      priority: 1.0,
    })
  })

  producersSnapshot.forEach((doc) => {
    const producer = getObject(doc) as Producer
    fields.push({
      loc: URL + "/producteur/" + doc.id,
      changefreq: "daily",
      lastmod: new Date(producer.updated || producer.created).toISOString(),
      priority: 0.8,
    })
  })

  ctx.res.setHeader("cache-control", SSR_CACHE_HEADER)

  return getServerSideSitemapLegacy(ctx, fields)
}

const NoOp = () => {
  // Default export to prevent Next.js errors
}

export default NoOp
