import styled from "@emotion/styled"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import CollectionsIcon from "@mui/icons-material/Collections"
import LoginIcon from "@mui/icons-material/Login"
import LogoutIcon from "@mui/icons-material/Logout"
import PersonIcon from "@mui/icons-material/Person"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemText from "@mui/material/ListItemText"
import NextLink from "next/link"
import { useRouter } from "next/router"
import { FC } from "react"
import Loader from "src/components/Loader"
import { COLORS, USER_ROLE } from "src/constants"
import { useUser } from "src/helpers/auth"
import { getName } from "src/helpers/user"

const Container = styled.nav`
  width: 300px;
  max-width: 80vw;
  background-color: ${COLORS.menu};
  height: 100%;
  color: ${COLORS.white};
  h1 {
    margin: 24px 16px 24px;
    font-weight: normal;
    font-size: 1.4em;
  }
  h2 {
    margin: -18px 16px 24px;
    font-weight: 300;
    font-size: 1em;
  }
  svg {
    fill: ${COLORS.white};
    margin-right: 20px;
  }
  hr {
    border-color: ${COLORS.divider};
  }
  .Mui-selected {
    background-color: rgba(255, 255, 255, 0.1);
    color: ${COLORS.green};
    svg {
      fill: ${COLORS.green};
    }
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }
`
const Center = styled.div`
  text-align: center;
  margin-top: 20vh;
`

interface LinkProps {
  href: string
  children: React.ReactNode
}
const ListItemLink: FC<LinkProps> = ({ href, children }) => {
  const { pathname } = useRouter()

  return (
    <NextLink href={href} passHref>
      <ListItem button component="a" selected={pathname === href}>
        {children}
      </ListItem>
    </NextLink>
  )
}

const Menu = () => {
  const { loading, authUser, user, signout } = useUser()

  if (loading || (authUser && !user)) {
    return (
      <Container>
        <Center>
          <Loader />
        </Center>
      </Container>
    )
  }

  return (
    <Container>
      <h1>Les Choux d’à Côté</h1>
      {user && <h2>{getName(user)}</h2>}
      <Divider />
      <List>
        {user?.role !== USER_ROLE.BUYER && (
          <ListItemLink href="/compte/producteur/annonce">
            <AddCircleIcon />
            <ListItemText>Créer une annonce</ListItemText>
          </ListItemLink>
        )}

        {authUser && (
          <>
            {user?.role === USER_ROLE.PRODUCER && (
              <ListItemLink href="/compte/producteur/annonces">
                <CollectionsIcon />
                <ListItemText>Mes annonces</ListItemText>
              </ListItemLink>
            )}
            <ListItemLink href="/compte/profil">
              <PersonIcon />
              <ListItemText>Mon profil</ListItemText>
            </ListItemLink>
            <ListItemLink href="/compte/alertes">
              <PersonIcon />
              <ListItemText>Mes alertes</ListItemText>
            </ListItemLink>
          </>
        )}
      </List>
      <Divider />
      <List>
        {authUser ? (
          <ListItem button onClick={signout}>
            <LogoutIcon />
            <ListItemText>Se déconnecter</ListItemText>
          </ListItem>
        ) : (
          <ListItemLink href="/connexion">
            <LoginIcon />
            <ListItemText>Se connecter</ListItemText>
          </ListItemLink>
        )}
      </List>
    </Container>
  )
}

export default Menu
