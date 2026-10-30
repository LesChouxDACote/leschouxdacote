import styled from "@emotion/styled"
import { IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import type { ChangeEvent } from "react"
import DeleteIcon from "src/assets/delete.svg"
import CustomSwitch from "src/components/CustomSwitch"
import HelpLink from "src/components/HelpLink"
import Link from "src/components/Link"
import { COLORS, USER_ROLE } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { getMapsLink, s } from "src/helpers/text"
import Layout from "src/layout"
import type { FollowedProducer } from "src/types/model"

const Container = styled.div`
  padding: 32px 4rem;
  @media (max-width: 900px) {
    padding: 30px 10px;
  }
`
const Title = styled.h1`
  text-align: center;
`
const HelpRow = styled.p`
  text-align: center;
`
const Card = styled.div`
  background-color: white;
  box-shadow: 5px 5px 20px #00000029;
  padding: 30px;
  margin-top: 20px;
`
const CardTitle = styled.h2`
  font-weight: bold;
  font-size: 20px;
`
const Content = styled.div`
  padding: 0 0 16px 0;
  @media (max-width: 900px) {
    padding: 0;
  }
`
const Subtitle = styled.h3`
  color: ${COLORS.dark};
  opacity: 0.7;
  font-size: 18px;
  font-weight: normal;
`
const TableWrapper = styled(TableContainer)`
  margin-top: 50px;
  color: ${COLORS.lightDark};
`
const DeleteButton = styled(IconButton)`
  width: 32px;
  margin-left: 30px;
`
const Tooltip = styled.div`
  display: none;
  position: absolute;
  top: -20px;
  right: 0px;
  width: 300px;
  padding: 5px 10px;
  background-color: #101010;
  color: white;
  font-size: 10px;
`
const Label = styled.label`
  cursor: pointer;
`

interface TableItem extends FollowedProducer {
  uid: string
}

const sortByName = (left: TableItem, right: TableItem) => {
  if (!left.name) {
    return -2
  }
  if (!right.name) {
    return 2
  }
  return left.name.toLowerCase() > right.name.toLowerCase() ? 1 : -1
}

const AlertsPage = () => {
  const { user, toggleFollow, toggleEmailAlert } = useUser()

  const numFollowedProducers = user?.followedProducers ? Object.keys(user.followedProducers).length : 0

  const items: TableItem[] = user?.followedProducers
    ? Object.keys(user.followedProducers).map((uid) => ({
        uid,
        ...user.followedProducers[uid],
      }))
    : []

  items.sort(sortByName)

  const handleAlertsExpired = async (_: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    await api.post("alerts", { type: "expired", value: checked })
  }

  return (
    <Layout title="Mes alertes" noindex fullWidth>
      <Container>
        <Title>Mes alertes utilisateur</Title>
        <HelpRow>
          <HelpLink slug="favoris-et-alertes" />
        </HelpRow>
        <Card>
          <CardTitle>Liste des producteurs favoris</CardTitle>
          <Content>
            <Subtitle>
              Vous avez {numFollowedProducers} producteur{s(numFollowedProducers)} artisan{s(numFollowedProducers)} en
              favoris
            </Subtitle>
            {numFollowedProducers > 0 && (
              <TableWrapper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producteur</TableCell>
                      <TableCell>Adresse</TableCell>
                      <TableCell align="right">Alertes pour les nouvelles annonces</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.uid}>
                        <TableCell>
                          <Link href={`/producteur/${item.uid}`}>{item.name}</Link>
                        </TableCell>
                        <TableCell>
                          <a href={getMapsLink(item)} target="_blank" rel="noopener">
                            {item.address}
                          </a>
                        </TableCell>
                        <TableCell align="right">
                          <CustomSwitch
                            defaultChecked={item.emailAlert}
                            onChange={() => toggleEmailAlert(item.uid, !item.emailAlert)}
                          />
                          <Tooltip>
                            {item.emailAlert
                              ? "Ne plus recevoir d'email lors des annonces de ce producteur"
                              : "Recevoir un email des annonces de ce producteur"}
                          </Tooltip>
                          <DeleteButton onClick={() => toggleFollow(item.uid, false)}>
                            <DeleteIcon />
                          </DeleteButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </Content>
        </Card>
      </Container>
      {user?.role === USER_ROLE.PRODUCER && (
        <Container>
          <Title>Mes alertes producteur</Title>
          <Card>
            <Label>
              <CustomSwitch defaultChecked={user.alertsExpired !== false} onChange={handleAlertsExpired} />
              Recevoir des alertes lorsque mes annonces expirent
            </Label>
          </Card>
        </Container>
      )}
    </Layout>
  )
}

export default AlertsPage
