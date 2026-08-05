import Head from "next/head"

const CONFIG = {
  title: "Les Choux d'à Côté",
  tagline: "Vente ultra directe : Le circuit le plus court des produits alimentaires",
  description:
    "Les Choux d'à Côté - Producteurs, publiez gratuitement des annonces de vos produits. Acheteurs, découvrez les produits locaux près de chez vous.",
  image: process.env.NEXT_PUBLIC_URL + "/opengraph.jpg",
  social: {
    twitter: "https://twitter.com/leschouxdacote",
  },
}

export interface SEOProps {
  title?: string
  description?: string
  image?: string
  noindex?: boolean
  ogTitle?: string
}

const SEO = ({ title, description, image, noindex, ogTitle }: SEOProps) => {
  const pageTitle = title ? `${title} | ${CONFIG.title}` : `${CONFIG.title} | ${CONFIG.tagline}`
  const pageDesc = description || CONFIG.description

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle || pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:site_name" content={CONFIG.title} />
      <meta property="og:image" content={image || CONFIG.image} />
      <meta property="twitter:card" content="summary" />
      <meta property="twitter:creator" content={CONFIG.social.twitter} />
      <meta property="twitter:title" content={pageTitle} />
      <meta property="twitter:description" content={pageDesc} />
      {noindex && <meta name="robots" content="noindex, follow" />}
    </Head>
  )
}

export default SEO
