import styled from "@emotion/styled"
import Link from "src/components/Link"
import { COLORS, SIZES } from "src/constants"
import { getHelpHref } from "src/constants/aide"

const StyledLink = styled(Link)`
  font-size: ${SIZES.regular}px;
  color: ${COLORS.blue};
  text-decoration: underline;
`

interface Props {
  slug: string
  className?: string
}

// Lien discret vers la page d'aide du sujet, ouverte dans un nouvel onglet pour ne pas perdre une saisie en cours
const HelpLink = ({ slug, className }: Props) => (
  <StyledLink href={getHelpHref(slug)} target="_blank" rel="noopener" className={className}>
    Besoin d&apos;aide ?
  </StyledLink>
)

export default HelpLink
