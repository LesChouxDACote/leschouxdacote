import styled from "@emotion/styled"
import FavoriteIcon from "@mui/icons-material/FavoriteBorder"
import { useCallback, useState } from "react"
import AccountProduct, { AccountProductVariant } from "src/components/AccountProduct"
import FollowersModal from "src/components/FollowersModal"
import { ButtonLink } from "src/components/Link"
import { Loading } from "src/components/Loader"
import { COLORS, LAYOUT, RADIUS, SIZES } from "src/constants"
import { useUser } from "src/helpers/auth"
import { useQuery } from "src/helpers/firebase"
import { s } from "src/helpers/text"
import Layout from "src/layout"
import { ProductEncoded } from "src/models/Product"
import type { Producer } from "src/types/model"

type Tab = "all" | "online" | "disabled"

const LAYOUT_OPTIONS: { id: AccountProductVariant; label: string; description: string }[] = [
  { id: "v1", label: "Proposition 1", description: "3 colonnes (Photo · Infos · Créneaux)" },
  { id: "v2", label: "Proposition 2", description: "Pilotage et vues regroupés à droite" },
  { id: "v3", label: "Proposition 3", description: "Créneaux en étiquettes et vues à droite" },
  { id: "current", label: "Actuel", description: "Affichage d’origine" },
]

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
const FollowersButton = styled.button`
  font: inherit;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 4px;
  &:hover {
    color: ${COLORS.green};
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
  color: ${({ $active }) => ($active ? COLORS.green : COLORS.text)};
  font-weight: ${({ $active }) => ($active ? 400 : 300)};
  padding: 10px 16px;
  margin-bottom: -1px;
  font-size: ${SIZES.subtitle}px;
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
const LayoutSwitcher = styled.div`
  margin: 24px 0 -16px;
  padding: 14px 16px;
  background-color: ${COLORS.odd};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`
const LayoutSwitcherLabel = styled.div`
  font-size: ${SIZES.regular}px;
  font-weight: 400;
  span {
    display: block;
    font-size: ${SIZES.small}px;
    font-weight: 300;
    color: ${COLORS.muted};
  }
`
const LayoutButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`
const LayoutOption = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  border-radius: ${RADIUS}px;
  border: 1px solid ${({ $active }) => ($active ? COLORS.green : COLORS.border)};
  background-color: ${({ $active }) => ($active ? COLORS.green : COLORS.white)};
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.text)};
  font-size: ${SIZES.small}px;
  font-weight: ${({ $active }) => ($active ? 400 : 300)};
  transition:
    background-color 150ms,
    border-color 150ms,
    color 150ms;
  &:hover {
    border-color: ${COLORS.green};
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
  const [layout, setLayout] = useState<AccountProductVariant>("v1")
  const [followersOpen, setFollowersOpen] = useState(false)
  const closeFollowers = useCallback(() => setFollowersOpen(false), [])

  const { data, loading } = useQuery<ProductEncoded>("products", user ? ["uid", "==", user.objectID] : false, true)

  const followers = user?.followers ? Object.keys(user.followers).length : null

  const now = Date.now()
  const tabsData: Record<Tab, ProductEncoded[]> = {
    all: data,
    online: data.filter(({ expires }) => expires && expires > now),
    disabled: data.filter(({ expires }) => !expires || expires <= now),
  }

  const currentLayoutOption = LAYOUT_OPTIONS.find(({ id }) => id === layout)

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
        <LayoutSwitcher>
          <LayoutSwitcherLabel>
            Présentation des cartes
            {currentLayoutOption && <span>{currentLayoutOption.description}</span>}
          </LayoutSwitcherLabel>
          <LayoutButtons role="group" aria-label="Présentation des cartes">
            {LAYOUT_OPTIONS.map(({ id, label }) => (
              <LayoutOption
                key={id}
                type="button"
                aria-pressed={id === layout}
                $active={id === layout}
                onClick={() => setLayout(id)}
              >
                {label}
              </LayoutOption>
            ))}
          </LayoutButtons>
        </LayoutSwitcher>
        <Tabs role="tablist">
          {TABS.map(({ id, title }) => (
            <Tab key={id} role="tab" aria-selected={id === tab} $active={id === tab} onClick={() => setTab(id)}>
              {title} ({tabsData[id].length})
            </Tab>
          ))}
        </Tabs>
        {tabsData[tab].length === 0 && <Empty>{TABS.find(({ id }) => id === tab)?.empty}</Empty>}
        {tabsData[tab].map((product, index) => (
          <AccountProduct key={product.objectID} product={product} odd={index % 2 === 0} variant={layout} />
        ))}
      </>
    )
  }

  return (
    <Layout title="Mes annonces" noindex>
      <Title>Mes annonces</Title>
      {followers ? (
        <Subtitle>
          <FollowersButton type="button" aria-haspopup="dialog" onClick={() => setFollowersOpen(true)}>
            <FavoriteIcon />
            {followers} abonné{s(followers)}
          </FollowersButton>
        </Subtitle>
      ) : null}
      {followersOpen && <FollowersModal onClose={closeFollowers} />}
      {renderContent()}
    </Layout>
  )
}

export default MyAdsPage
