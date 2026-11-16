import styled from "@emotion/styled"
import { Button } from "@mui/material"
import IconHeartEmpty from "src/assets/icon-heart-empty.svg"
import IconHeart from "src/assets/icon-heart.svg"
import { COLORS } from "src/constants"
import { useUser } from "src/helpers/auth"
import { isFollowed } from "src/helpers/user"

const Container = styled(Button)`
  margin: 20px auto 10px;
  background-color: ${COLORS.white};
  color: ${COLORS.red};
  text-transform: none;
  font-weight: 300;
  &:hover {
    background-color: ${COLORS.white};
  }
`

interface Props {
  producer: string
}

const FollowButton = ({ producer }: Props) => {
  const { authUser, user, loading, toggleFollow } = useUser()
  const followed = isFollowed(producer, user)

  // Connecté mais profil pas encore chargé : un clic redirigerait à tort vers la connexion
  if (loading || (authUser && !user)) {
    return null
  }

  return (
    <Container
      onClick={() => toggleFollow(producer, !followed)}
      variant="contained"
      startIcon={followed ? <IconHeart /> : <IconHeartEmpty />}
    >
      {followed ? "Ne plus suivre le producteur" : "Suivre le producteur"}
    </Container>
  )
}

export default FollowButton
