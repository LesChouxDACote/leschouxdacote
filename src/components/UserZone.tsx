import { css } from "@emotion/react"
import styled from "@emotion/styled"
import DownIcon from "src/assets/down.svg"
import { Button } from "src/components/Button"
import Link, { ButtonLink } from "src/components/Link"
import Loader from "src/components/Loader"
import { COLORS, USER_ROLE } from "src/constants"
import { useUser } from "src/helpers/auth"
import { useMenu } from "src/helpers/menu"
import { ellipsis } from "src/helpers/text"
import { getName } from "src/helpers/user"

const Name = styled.span`
  min-width: 100px;
  display: inline-block;
`
const Dropdown = styled.div`
  svg {
    vertical-align: middle;
    margin: -7px -5px -6px 2px;
    fill: ${COLORS.input};
  }
  position: relative;
`
const Placeholder = styled(Button)`
  visibility: hidden;
`
const ProducerButton = styled(Button)<{ $open: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  background-color: ${({ $open }) => ($open ? "#e6e6e6" : "initial")};
`
const Menu = styled.div`
  margin: 8px -16px -8px;
  background-color: ${COLORS.white};
  border-top: 1px solid ${COLORS.border};
`
const entryCss = css`
  display: block;
  border: none;
  padding: 8px 16px;
  width: 100%;
  text-align: left;
  background-color: transparent;
  color: ${COLORS.input};
  transition:
    background-color 150ms,
    color 150ms;
  &:hover {
    background-color: ${COLORS.green};
    color: ${COLORS.white};
  }
`

const Entry = styled(Link)`
  ${entryCss}
`

const Logout = styled.a`
  ${entryCss}
  border-top: 1px solid ${COLORS.border};
`

const UserZone = () => {
  const { loading, authUser, user, signout } = useUser()
  const { ref, open, setOpen } = useMenu()

  if (loading || (authUser && !user)) {
    return <Loader />
  }

  const title = (
    <Name>
      {ellipsis(getName(user))} <DownIcon />
    </Name>
  )

  if (!authUser) {
    return <ButtonLink href="/connexion">Se connecter</ButtonLink>
  }

  return (
    <Dropdown ref={ref}>
      <Placeholder>{title}</Placeholder>
      <ProducerButton $variant="white" onClick={() => setOpen(!open)} $open={open}>
        {title}
        {open && (
          <Menu>
            {user?.role === USER_ROLE.PRODUCER && <Entry href="/compte/producteur/annonces">Mes annonces</Entry>}
            <Entry href="/compte/profil">Mon profil</Entry>
            <Entry href="/compte/alertes">Mes alertes</Entry>
            <Logout onClick={signout}>Se déconnecter</Logout>
          </Menu>
        )}
      </ProducerButton>
    </Dropdown>
  )
}

export default UserZone
