import styled from "@emotion/styled"
import Link from "src/components/Link"
import { COLORS, CONTACT_EMAIL, LAYOUT } from "src/constants"
import Layout from "src/layout"

// Même apparence que la page « À propos » : fond vert pâle sur toute la largeur, texte plus gros et plus aéré
export const HelpBackground = styled.div`
  background-color: ${COLORS.background.success};
  font-size: 17px;
  font-weight: 400;
  line-height: 1.7;
  h1,
  h2 {
    color: ${COLORS.dark};
  }
`
export const HelpColumn = styled.div`
  max-width: ${LAYOUT.maxWidth}px;
  margin: 0 auto;
  padding: 32px;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 24px;
  }
`
const Content = styled(HelpColumn)`
  a {
    text-decoration: underline;
  }
  li {
    margin: 6px 0;
  }
`
const Back = styled(Link)`
  display: inline-block;
  margin-bottom: 16px;
  color: ${COLORS.grey};
`
const Contact = styled.p`
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid ${COLORS.border};
  color: ${COLORS.grey};
`

// Libellé de l'interface cité dans l'aide (bouton, menu, champ)
export const Ui = styled.strong`
  font-weight: bold;
`

interface Props {
  title: string
  children: React.ReactNode
}

const HelpPage = ({ title, children }: Props) => (
  <Layout title={`${title} – Aide`} fullWidth>
    <HelpBackground>
      <Content>
        <Back href="/aide">← Retour à l&apos;aide</Back>
        <h1>{title}</h1>
        {children}
        <Contact>
          Vous ne trouvez pas la réponse ? Écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </Contact>
      </Content>
    </HelpBackground>
  </Layout>
)

export default HelpPage
