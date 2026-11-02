import styled from "@emotion/styled"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { Form, SubmitButton, TextInput, ValidationError } from "src/components/Form"
import Link from "src/components/Link"
import Message from "src/components/Message"
import { auth } from "src/helpers/firebase"
import { MIN_PASSWORD_LENGTH, validatePassword } from "src/helpers/validators"
import Layout from "src/layout"

interface NewPassword {
  email: string
  password: string
}

const Paragraph = styled.p`
  a {
    text-decoration: underline;
  }
`

const INVALID_CODES = ["auth/expired-action-code", "auth/invalid-action-code", "auth/argument-error"]

// Page ouverte depuis l'e-mail de réinitialisation (cf. api/password-reset) : servie par le domaine
// du site pour que les gestionnaires de mots de passe y associent le nouveau mot de passe
const NewPasswordPage = () => {
  const { query, isReady, push } = useRouter()
  const oobCode = typeof query.oobCode === "string" ? query.oobCode : ""
  const [email, setEmail] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (!oobCode) {
      setInvalid(true)
      return
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(setEmail)
      .catch(() => setInvalid(true))
  }, [isReady, oobCode])

  const handleSubmit: Submit<NewPassword> = async (data) => {
    try {
      await confirmPasswordReset(auth, oobCode, data.password)
    } catch (error) {
      if (error.code === "auth/weak-password") {
        throw new ValidationError("password", validatePassword("") as string)
      }
      if (INVALID_CODES.includes(error.code)) {
        setInvalid(true)
        return
      }
      throw error
    }
    await push("/connexion?reset=1")
  }

  return (
    <Layout title="Choisir un nouveau mot de passe">
      {invalid ? (
        <Message title="Lien expiré" type="info">
          <p>Ce lien de réinitialisation n’est plus valable : il a déjà servi ou a expiré.</p>
          <Paragraph>
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </Paragraph>
        </Message>
      ) : (
        email && (
          <Form
            title="Choisir un nouveau mot de passe"
            onSubmit={handleSubmit}
            defaultValues={{ email }}
            resetOnChange={email}
          >
            <TextInput name="email" label="Adresse e-mail" type="email" autoComplete="username" readOnly />
            <TextInput
              name="password"
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              validate={validatePassword}
              required
            />
            <SubmitButton />
          </Form>
        )
      )}
    </Layout>
  )
}

export default NewPasswordPage
