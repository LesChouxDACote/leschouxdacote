import styled from "@emotion/styled"
import { COLORS, LAYOUT, SIZES } from "src/constants"

// Mise en page des pages de contenu (À propos, Actualité), à utiliser dans <Layout fullWidth>

// Fond vert pâle sur toute la largeur, texte plus gras et plus aéré que le reste du site (Nunito 300)
export const Page = styled.div`
  background-color: ${COLORS.background.success};
  font-size: ${SIZES.regular}px;
  font-weight: 400;
  line-height: 1.7;
  h1,
  h2 {
    color: ${COLORS.text};
  }
`
export const Column = styled.div`
  max-width: ${LAYOUT.maxWidth}px;
  margin: 0 auto;
  padding: 32px;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 24px;
  }
`
