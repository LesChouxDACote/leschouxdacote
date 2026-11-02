import styled from "@emotion/styled"
import { GetStaticPaths, GetStaticProps } from "next"
import Link from "src/components/Link"
import { COLORS, RADIUS } from "src/constants"
import { ARTICLES } from "src/constants/actualite"
import { formatDate } from "src/helpers/date"
import Layout from "src/layout"
import { Column, Page } from "src/layout/content"

// Largeur de lecture : lignes plus courtes que la colonne du site
const Reading = styled.article`
  max-width: 760px;
  margin: 0 auto;
  h1 {
    margin-bottom: 8px;
  }
  h3 {
    color: ${COLORS.green};
  }
  a {
    text-decoration: underline;
  }
`
const Meta = styled.p`
  margin: 0 0 24px;
  color: ${COLORS.muted};
`
const Cover = styled.img`
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: ${RADIUS}px;
  margin-bottom: 24px;
`
const Back = styled.p`
  margin-top: 48px;
`

interface Props {
  slug: string
}
type Params = {
  slug: string
}

const ArticlePage = ({ slug }: Props) => {
  // le corps (JSX) n'est pas sérialisable : getStaticProps ne passe que le slug
  const article = ARTICLES.find((item) => item.slug === slug)
  if (!article) {
    return null
  }

  return (
    <Layout
      title={article.title}
      description={article.summary}
      image={process.env.NEXT_PUBLIC_URL + article.image}
      fullWidth
    >
      <Page>
        <Column>
          <Reading>
            <h1>{article.title}</h1>
            <Meta>
              <time dateTime={article.date}>{formatDate(new Date(article.date))}</time> · {article.author}
            </Meta>
            <Cover src={article.image} alt="" />
            {article.body}
            <Back>
              <Link href="/actualite">← Toutes les actualités</Link>
            </Back>
          </Reading>
        </Column>
      </Page>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps<Props, Params> = async ({ params }) => ({
  props: { slug: params!.slug },
})

export const getStaticPaths: GetStaticPaths<Params> = async () => ({
  paths: ARTICLES.map(({ slug }) => ({ params: { slug } })),
  fallback: false,
})

export default ArticlePage
