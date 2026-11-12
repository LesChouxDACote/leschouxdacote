import styled from "@emotion/styled"
import { Button } from "@mui/material"
import IconHeartEmpty from "src/assets/icon-heart-empty.svg"
import IconHeart from "src/assets/icon-heart.svg"
import { COLORS } from "src/constants"
import { useUser } from "src/helpers/auth"
import { isFollowed } from "src/helpers/user"

// `&&` passe devant le fond vert du variant "contained" du thème MUI, quel que soit l'ordre d'injection des styles
const Container = styled(Button)`
  && {
    margin: 20px auto 10px;
    background-color: ${COLORS.white};
    color: ${COLORS.red};
    text-transform: none;
    font-weight: 300;
    &:hover {
      background-color: ${COLORS.white};
    }
    &.Mui-disabled {
      background-color: ${COLORS.white};
      color: ${COLORS.red};
      opacity: 0.5;
    }
  }
`

interface Props {
  producer: string
}

const FollowButton = ({ producer }: Props) => {
  const { loading, authUser, user, toggleFollow } = useUser()
  const followed = isFollowed(producer, user)
  // Tant que la session ou le profil ne sont pas chargés, toggleFollow redirigerait vers la connexion
  const pending = loading || (authUser !== null && user === null)

  return (
    // Bulle native (title) : elle décrit le bouton sans remplacer son nom accessible (« Suivre le producteur »)
    <Container
      onClick={() => toggleFollow(producer, !followed)}
      variant="contained"
      disabled={pending}
      startIcon={followed ? <IconHeart /> : <IconHeartEmpty />}
      title={
        followed
          ? "Ne plus recevoir d'alerte pour les nouveaux produits de ce producteur."
          : "Recevoir une alerte lorsque ce producteur a un nouveau produit."
      }
    >
      {followed ? "Ne plus suivre le producteur" : "Suivre le producteur"}
    </Container>
  )
}

export default FollowButton
