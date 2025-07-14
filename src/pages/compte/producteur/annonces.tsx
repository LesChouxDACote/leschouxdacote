import styled from "@emotion/styled"
import FavoriteIcon from "@mui/icons-material/FavoriteBorder"
import { useState } from "react"
import AccountProduct from "src/components/AccountProduct"
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
  margin: 40px 0 20px;
`
const Tab = styled.button<{ $active: boolean }>`
  color: ${({ $active }) => ($active ? COLORS.green : COLORS.dark)};
  padding: 0;
  font-size: ${SIZES.large}px;
  @media (max-width: ${LAYOUT.mobile}px) {
    margin-bottom: 8px;
    display: block;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    &:not(:last-of-type) {
      margin-right: 10px;
      padding-right: 10px;
      border-right: 1px solid ${COLORS.dark};
    }
  }
`

const TABS: { id: Tab; title: string }[] = [
  { id: "all", title: "Toutes mes annonces" },
  { id: "online", title: "Annonces en ligne" },
  { id: "disabled", title: "Annonces désactivées" },
]

const MyAdsPage = () => {
  const { user } = useUser<Producer>()
  const [tab, setTab] = useState<Tab>("all")

  const { data } = useQuery<ProductEncoded>("products", user ? ["uid", "==", user.objectID] : false, true)

  const followers = user?.followers ? Object.keys(user.followers).length : null

  const now = Date.now()
  const tabsData: Record<Tab, ProductEncoded[]> = {
    all: data,
    online: data.filter(({ expires }) => expires && expires > now),
    disabled: data.filter(({ expires }) => !expires || expires <= now),
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
      <Tabs>
        {TABS.map(({ id, title }) => (
          <Tab key={id} $active={id === tab} onClick={() => setTab(id)}>
            {title} ({tabsData[id].length})
          </Tab>
        ))}
      </Tabs>
      {tabsData[tab].map((product, index) => (
        <AccountProduct key={product.objectID} product={product} odd={index % 2 === 0} />
      ))}
    </Layout>
  )
}

export default MyAdsPage
