import styled from "@emotion/styled"
import { Divider, Stack, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { Button } from "src/components/Button"
import Loader from "src/components/Loader"
import Modal from "src/components/Modal"
import api from "src/helpers/api"
import { auth } from "src/helpers/firebase"
import type { FollowerInfo } from "src/types/model"

const Title = styled.h3`
  margin: 0 32px 20px;
`
const List = styled(Stack)`
  text-align: left;
  margin-bottom: 20px;
`

interface Props {
  onClose: () => void
}

// Abonnés du producteur connecté (prénom, nom, e-mail), téléchargeables en CSV.
const FollowersModal = ({ onClose }: Props) => {
  const [followers, setFollowers] = useState<FollowerInfo[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get<{ followers: FollowerInfo[] }>("follow")
      .then((data) => setFollowers(data.followers))
      .catch(() => setError(true))
  }, [])

  const handleDownload = async () => {
    const headers = new Headers()
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      headers.set("X-Token", token)
    }
    const response = await fetch("/api/follow?format=csv", { headers })
    if (!response.ok) {
      alert("Une erreur est survenue, la liste n’a pas pu être téléchargée.")
      return
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `abonnes-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (error) {
      return <p>Une erreur est survenue, la liste de vos abonnés n’a pas pu être chargée.</p>
    }
    if (!followers) {
      return <Loader />
    }
    if (followers.length === 0) {
      return <p>Vous n’avez pas encore d’abonné.</p>
    }
    return (
      <>
        <List spacing={1.5} divider={<Divider flexItem />}>
          {followers.map(({ objectID, firstname, lastname, email }) => (
            <Stack key={objectID} spacing={0.5}>
              <Typography variant="body1" sx={{ fontWeight: "bold", overflowWrap: "anywhere" }}>
                {`${firstname || ""} ${lastname || ""}`.trim() || "Sans nom"}
              </Typography>
              {email && (
                <Typography variant="body2" color="textSecondary" sx={{ overflowWrap: "anywhere" }}>
                  <a href={`mailto:${email}`}>{email}</a>
                </Typography>
              )}
            </Stack>
          ))}
        </List>
        <Button $variant="green" onClick={handleDownload}>
          Télécharger la liste
        </Button>
      </>
    )
  }

  return (
    <Modal onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Mes abonnés">
        <Title>Mes abonnés</Title>
        {renderContent()}
      </div>
    </Modal>
  )
}

export default FollowersModal
