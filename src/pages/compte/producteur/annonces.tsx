import styled from "@emotion/styled"
import FavoriteIcon from "@mui/icons-material/FavoriteBorder"
import { useState } from "react"
import AccountProduct from "src/components/AccountProduct"
import { ButtonLink } from "src/components/Link"
import { Loading } from "src/components/Loader"
import { COLORS, LAYOUT, SIZES } from "src/constants"
import { useUser } from "src/helpers/auth"
import { useQuery } from "src/helpers/firebase"
import { s } from "src/helpers/text"
import Layout from "src/layout"
import { ProductEncoded } from "src/models/Product"
import type { Producer } from "src/types/model"

type Tab = "all" | "online" | "disabled"

const Title = styled.h1`
  text-align: center;
`
const Subtitle = styled.h2`
  text-align: center;
  margin: -12px 0 24px;
  svg {
    vertical-align: -4px;
    margin-right: 8px;
  }
`
const Tabs = styled.div`
  display: flex;
  margin: 40px 0 20px;
  border-bottom: 1px solid ${COLORS.border};
  @media (max-width: ${LAYOUT.mobile}px) {
    overflow-x: auto;
    margin: 24px -24px 20px;
    padding: 0 24px;
  }
`
const Tab = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  color: ${({ $active }) => ($active ? COLORS.green : COLORS.dark)};
  font-weight: ${({ $active }) => ($active ? 400 : 300)};
  padding: 10px 16px;
  margin-bottom: -1px;
  font-size: ${SIZES.large}px;
  border-bottom: 3px solid ${({ $active }) => ($active ? COLORS.green : "transparent")};
  transition: border-color 150ms;
  &:hover {
    border-bottom-color: ${({ $active }) => ($active ? COLORS.green : COLORS.border)};
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 10px 12px;
    font-size: ${SIZES.regular}px;
  }
`
const Empty = styled.div`
  text-align: center;
  margin: 40px 0;
  p {
    margin-bottom: 20px;
  }
`

const TABS: { id: Tab; title: string; empty: string }[] = [
  { id: "all", title: "Toutes mes annonces", empty: "Aucune annonce pour le moment." },
  { id: "online", title: "Annonces en ligne", empty: "Aucune annonce en ligne pour le moment." },
  { id: "disabled", title: "Annonces désactivées", empty: "Aucune annonce désactivée ou terminée." },
]

const MyAdsPage = () => {
  const { user } = useUser<Producer>()
  const [tab, setTab] = useState<Tab>("all")

  const { data, loading } = useQuery<ProductEncoded>("products", user ? ["uid", "==", user.objectID] : false, true)

  const followers = user?.followers ? Object.keys(user.followers).length : null

  const now = Date.now()
  const tabsData: Record<Tab, ProductEncoded[]> = {
    all: data,
    online: data.filter(({ expires }) => expires && expires > now),
    disabled: data.filter(({ expires }) => !expires || expires <= now),
  }

  const renderContent = () => {
    if (loading || !user) {
      return <Loading />
    }
    if (data.length === 0) {
      return (
        <Empty>
          <p>Vous n’avez pas encore d’annonce. Créez la première pour faire connaître vos produits !</p>
          <ButtonLink href="/compte/producteur/annonce" $variant="green">
            Créer une annonce
          </ButtonLink>
        </Empty>
      )
    }
    return (
      <>
        <Tabs role="tablist">
          {TABS.map(({ id, title }) => (
            <Tab key={id} role="tab" aria-selected={id === tab} $active={id === tab} onClick={() => setTab(id)}>
              {title} ({tabsData[id].length})
            </Tab>
          ))}
        </Tabs>
        {tabsData[tab].length === 0 && <Empty>{TABS.find(({ id }) => id === tab)?.empty}</Empty>}
        {tabsData[tab].map((product, index) => (
          <AccountProduct key={product.objectID} product={product} odd={index % 2 === 0} />
        ))}
      </>
    )
  }

  return (
    <Layout title="Mes annonces" noindex>
      <Title>Mes annonces</Title>
      {followers && (
        <Subtitle>
          <FavoriteIcon />
          {followers} abonné{s(followers)}
        </Subtitle>
      )}
      {renderContent()}
    </Layout>
  )
}

export default MyAdsPage
