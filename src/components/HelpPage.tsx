import styled from "@emotion/styled"
import Link from "src/components/Link"
import { COLORS, CONTACT_EMAIL } from "src/constants"
import Layout from "src/layout"

const Content = styled.div`
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
  <Layout title={`${title} – Aide`}>
    <Content>
      <Back href="/aide">← Retour à l&apos;aide</Back>
      <h1>{title}</h1>
      {children}
      <Contact>
        Vous ne trouvez pas la réponse ? Écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </Contact>
    </Content>
  </Layout>
)

export default HelpPage
