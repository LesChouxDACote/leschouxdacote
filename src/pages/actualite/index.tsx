import styled from "@emotion/styled"
import Link from "src/components/Link"
import { COLORS, LAYOUT } from "src/constants"
import { ARTICLES } from "src/constants/actualite"
import { formatDate } from "src/helpers/date"
import Layout from "src/layout"
import { Column, Page } from "src/layout/content"

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin: 24px 0;
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  overflow: hidden;
  background-color: ${COLORS.white};
  color: inherit;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0px 3px 6px ${COLORS.shadow.regular};
  }
  img {
    display: block;
    width: 100%;
    height: 180px;
    object-fit: cover;
  }
  div {
    padding: 16px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 1.15em;
    line-height: 1.4;
    color: ${COLORS.green};
  }
  time {
    color: ${COLORS.grey};
    font-size: 0.9em;
  }
  p {
    margin: 8px 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

const NewsPage = () => (
  <Layout title="Actualité" fullWidth>
    <Page>
      <Column>
        <h1>Actualité</h1>
        <Grid>
          {ARTICLES.map((article) => (
            <Card key={article.slug} href={`/actualite/${article.slug}`}>
              <img src={article.image} alt="" />
              <div>
                <h2>{article.title}</h2>
                <time dateTime={article.date}>{formatDate(new Date(article.date))}</time>
                <p>{article.summary}</p>
              </div>
            </Card>
          ))}
        </Grid>
      </Column>
    </Page>
  </Layout>
)

export default NewsPage
