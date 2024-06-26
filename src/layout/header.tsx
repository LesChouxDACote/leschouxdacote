import styled from "@emotion/styled"
import MenuIcon from "@mui/icons-material/Menu"
import SearchIcon from "@mui/icons-material/Search"
import IconButton from "@mui/material/IconButton"
import SwipeableDrawer from "@mui/material/SwipeableDrawer"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import LogoSvg from "src/assets/logo.svg"
import Link, { ButtonLink } from "src/components/Link"
import Menu from "src/components/Menu"
import SearchBar from "src/components/SearchBar"
import UserZone from "src/components/UserZone"
import { COLORS, LAYOUT, USER_ROLE } from "src/constants"
import { useUser } from "src/helpers/auth"

const Container = styled.header`
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: ${COLORS.white};
  box-shadow: 0px 3px 3px ${COLORS.shadow.light};
`
const Content = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--header-height);
`
const Desktop = styled(Content)`
  padding: 0 32px;
  @media (max-width: ${LAYOUT.mobile}px) {
    display: none;
  }
`
const Mobile = styled(Content)`
  padding: 0 16px;
  background-color: ${COLORS.green};
  color: ${COLORS.white};
  a {
    padding: 8px 10px;
    display: block;
    font-size: 1.2em;
    font-weight: 400;
  }
  svg {
    fill: ${COLORS.white};
    vertical-align: middle;
    width: 28px;
    height: 28px;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    display: none;
  }
`
const Spacer = styled.div`
  flex: 1;
`
const Logo = styled(LogoSvg)`
  height: 45px;
  margin-left: -8px;
  display: block;
  @media (max-width: ${LAYOUT.mobile}px) {
    height: 30px;
  }
`
const Middle = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  > a {
    margin: 0 36px;
  }
  form {
    width: 35vw;
    @media (max-width: ${LAYOUT.tablet}px) {
      display: none;
    }
  }
`
const Cta = styled(ButtonLink)`
  margin-right: 16px;
`

const ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || "development"

const Header = () => {
  const { pathname, events } = useRouter()
  const [openMenu, setOpen] = useState(false)
  const { user } = useUser()

  const isHome = pathname === "/"

  useEffect(() => {
    const handleChange = () => setOpen(false)
    events.on("routeChangeStart", handleChange)
    return () => events.off("routeChangeStart", handleChange)
  }, [events])

  return (
    <Container>
      <Desktop>
        {isHome ? (
          <Spacer>{ENV !== "production" ? ENV : null}</Spacer>
        ) : (
          <>
            <Link href="/">
              <Logo />
            </Link>
            <Middle>
              <SearchBar />
            </Middle>
          </>
        )}
        {user?.role !== USER_ROLE.BUYER && (
          <Cta href="/compte/producteur/annonce" $variant="green">
            Créer une annonce
          </Cta>
        )}
        {user?.role === USER_ROLE.ADMIN && (
          <Cta href="/csv-export" $variant="red">
            Export des CSVs
          </Cta>
        )}

        <UserZone />
      </Desktop>
      <Mobile>
        <IconButton onClick={() => setOpen(!openMenu)}>
          <MenuIcon titleAccess="Menu" />
        </IconButton>
        <Link href="/">Les Choux d’à Côté</Link>
        <Link href="/">
          <SearchIcon titleAccess="Recherche" />
        </Link>
        <SwipeableDrawer open={openMenu} onOpen={() => setOpen(true)} onClose={() => setOpen(false)}>
          <Menu />
        </SwipeableDrawer>
      </Mobile>
    </Container>
  )
}

export default Header
