import styled from "@emotion/styled"
import { useRouter } from "next/router"
import { Form, SubmitButton, TextInput, ValidationError } from "src/components/Form"
import Link from "src/components/Link"
import Message from "src/components/Message"
import { COLORS, LAYOUT } from "src/constants"
import { useUser } from "src/helpers/auth"
import Layout from "src/layout"

const LostPassword = styled.div`
  font-size: 0.8em;
  color: ${COLORS.grey};
  text-align: right;
`
export const Register = styled.div`
  text-align: center;
`

export const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
`
const Card = styled.div`
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.24);
  background: #fff;
  display: inline-block;
  padding: 2rem 3rem;
  min-width: 40vw;
  border-radius: 4px;
  margin-top: 50px;

  @media (max-width: ${LAYOUT.tablet}px) {
    width: 70vw;
    margin: 40px auto;
    padding: 20px 40px;
  }

  @media (max-width: ${LAYOUT.mobile}px) {
    width: 100%;
    padding: 20px;
  }
`

const Span = styled.span`
  font-weight: 700;
  display: inline;
  text-decoration: underline;
`

const LoginPage = () => {
  const { signin } = useUser()
  const { query } = useRouter()

  const handleSubmit: Submit<Signin> = async (data) => {
    try {
      await signin(data.email, data.password)
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        throw new ValidationError("email", "Adresse e-mail invalide")
      }
      if (error.code === "auth/user-not-found") {
        throw new ValidationError("email", "L'adresse e-mail est inconnue")
      }
      if (error.code === "auth/user-disabled") {
        throw new ValidationError("email", "Ce compte est désactivé")
      }
      if (error.code === "auth/wrong-password") {
        throw new ValidationError("password", "Le mot de passe est incorrect")
      }
      throw error
    }
  }

  return (
    <Layout title="Connexion">
      {query.next && (
        <Message type="info">
          <p>Vous devez vous connecter pour accéder à cette fonctionnalité.</p>
        </Message>
      )}
      {query.success && (
        <Message title="Inscription effectuée" type="success">
          Vous pouvez vous connecter dès à présent et utiliser les fonctionnalités de la plateforme.
        </Message>
      )}
      <Wrapper>
        <Card>
          <Form title="Connexion" onSubmit={handleSubmit}>
            <TextInput name="email" label="Email" type="email" required />
            <TextInput name="password" label="Mot de passe" type="password" required />
            <LostPassword>
              <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
            </LostPassword>
            <SubmitButton fullWidth={true}>Se connecter</SubmitButton>
            <Register>
              <Link href="/inscription">
                Pas encore inscrit ? <Span>Créer un compte </Span>{" "}
              </Link>
            </Register>
          </Form>
        </Card>
      </Wrapper>
    </Layout>
  )
}

export default LoginPage
