import styled from "@emotion/styled"
import { Button } from "src/components/Button"
import Link from "src/components/Link"
import { COLORS, LAYOUT, SIZES } from "src/constants"
import { useConsent } from "src/helpers/consent"

const Container = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background-color: ${COLORS.white};
  border-top: 1px solid ${COLORS.border};
  box-shadow: 0 -3px 6px ${COLORS.shadow.light};
  padding: 16px 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: ${SIZES.regular}px;
  p {
    flex: 1;
    margin: 0;
  }
  a {
    text-decoration: underline;
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px 24px;
  }
`
const Actions = styled.div`
  display: flex;
  gap: 16px;
  button {
    flex: 1;
    min-width: 120px;
  }
`

const CookieBanner = () => {
  const { choice, accept, refuse } = useConsent()

  if (choice !== null) {
    return null
  }

  return (
    <Container role="region" aria-label="Cookies">
      <p>
        Nous utilisons Google Analytics pour mesurer la fréquentation du site et l&apos;améliorer. Ces cookies ne sont
        déposés qu&apos;avec votre accord. Votre refus n&apos;empêche pas l&apos;utilisation du site.{" "}
        <Link href="/charte">En savoir plus</Link>
      </p>
      <Actions>
        <Button $variant="white" onClick={refuse}>
          Refuser
        </Button>
        <Button $variant="white" onClick={accept}>
          Accepter
        </Button>
      </Actions>
    </Container>
  )
}

export default CookieBanner
