import styled from "@emotion/styled"
import { useState } from "react"
import Link from "src/components/Link"
import { COLORS, CONTACT_EMAIL, LAYOUT } from "src/constants"
import { getHelpHref, HELP_GROUPS, HelpGroup, searchHelpTopics } from "src/constants/aide"
import Layout from "src/layout"

const Title = styled.h1`
  text-align: center;
`
const Intro = styled.p`
  text-align: center;
  a {
    text-decoration: underline;
  }
`
const Search = styled.input`
  display: block;
  width: 100%;
  max-width: ${LAYOUT.formWidth}px;
  margin: 24px auto 32px;
  padding: 10px 12px;
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  font-size: 1em;
`
const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
`
const Card = styled(Link)`
  display: block;
  padding: 20px;
  background-color: ${COLORS.white};
  border-radius: 6px;
  box-shadow: 5px 5px 20px #00000029;
  font-weight: bold;
  &:hover {
    color: ${COLORS.green};
  }
`
const Empty = styled.p`
  text-align: center;
  color: ${COLORS.grey};
`
const Contact = styled.p`
  margin-top: 48px;
  text-align: center;
  a {
    text-decoration: underline;
  }
`

const GROUPS = Object.keys(HELP_GROUPS) as HelpGroup[]

const HelpHomePage = () => {
  const [query, setQuery] = useState("")
  const topics = searchHelpTopics(query)

  return (
    <Layout title="Aide en ligne">
      <Title>Aide en ligne</Title>
      <Intro>
        Producteurs et artisans, <Link href="/inscription">inscrivez-vous gratuitement ici</Link>.
      </Intro>
      <Search
        type="search"
        placeholder="Rechercher un sujet (créneau, SIRET, réservation…)"
        aria-label="Rechercher un sujet"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {topics.length === 0 && <Empty>Aucun sujet ne correspond à votre recherche.</Empty>}
      {GROUPS.map((group) => {
        const groupTopics = topics.filter((topic) => topic.group === group)
        if (groupTopics.length === 0) {
          return null
        }
        return (
          <section key={group}>
            <h2>{HELP_GROUPS[group]}</h2>
            <Cards>
              {groupTopics.map((topic) => (
                <Card key={topic.slug} href={getHelpHref(topic.slug)}>
                  {topic.title}
                </Card>
              ))}
            </Cards>
          </section>
        )
      })}
      <Contact>
        Une question sans réponse ? Écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </Contact>
    </Layout>
  )
}

export default HelpHomePage
