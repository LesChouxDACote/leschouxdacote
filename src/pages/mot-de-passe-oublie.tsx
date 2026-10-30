import { useState } from "react"
import { Form, SubmitButton, TextInput } from "src/components/Form"
import Link from "src/components/Link"
import api from "src/helpers/api"
import Layout from "src/layout"
import { Register } from "src/pages/connexion"

export const LostPasswordPage = () => {
  const [sent, setSent] = useState(false)

  // L'e-mail part du serveur (Mailjet) avec un lien vers /nouveau-mot-de-passe ; les adresses
  // invalides ou inconnues reviennent en erreurs de champ (ValidationError via api.post)
  const handleSubmit: Submit<LostPassword> = async (data) => {
    await api.post("password-reset", { email: data.email })
    setSent(true)
  }

  return (
    <Layout title="Mot de passe oublié">
      <Form title="Mot de passe oublié" onSubmit={handleSubmit}>
        {sent ? (
          <p>Veuillez cliquer sur le lien de réinitialisation que nous venons de vous envoyer</p>
        ) : (
          <>
            <TextInput name="email" label="Adresse e-mail" type="email" required />
            <SubmitButton />
            <Register>
              <Link href="/inscription">Pas encore inscrit ? Créer un compte producteur</Link>
            </Register>
          </>
        )}
      </Form>
    </Layout>
  )
}

export default LostPasswordPage
