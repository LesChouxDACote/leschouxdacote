import styled from "@emotion/styled"
import { useRouter } from "next/router"
import { useState } from "react"
import { Button, LinkButton } from "src/components/Button"
import { ValidationError } from "src/components/Form"
import { COLORS, CONTACT_EMAIL, RADIUS, SIZES } from "src/constants"
import api from "src/helpers/api"
import Layout from "src/layout"
import { Column, Page } from "src/layout/content"

const Card = styled.section`
  max-width: 640px;
  margin: 0 auto;
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  padding: 28px;
  h1 {
    margin: 0 0 12px;
    font-size: ${SIZES.title}px;
  }
  p {
    margin: 0 0 16px;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
`

const Notice = styled.p<{ $tone: "success" | "error" }>`
  padding: 12px 16px;
  border-radius: ${RADIUS}px;
  background-color: ${({ $tone }) => ($tone === "success" ? COLORS.background.success : "#fdecec")};
  color: ${({ $tone }) => ($tone === "success" ? COLORS.green : COLORS.red)};
`

const UnsubscribeNewsletterPage = () => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uid = typeof router.query.uid === "string" ? router.query.uid : ""
  const token = typeof router.query.token === "string" ? router.query.token : ""
  const hasLinkParams = Boolean(uid && token)

  const handleConfirm = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await api.post("newsletter-unsubscribe", { uid, token })
      setDone(true)
    } catch (err) {
      if (err instanceof ValidationError) {
        setError(err.message)
      } else {
        setError(`Impossible d'enregistrer votre désinscription. Écrivez-nous à ${CONTACT_EMAIL}.`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Désinscription des actualités" noindex fullWidth>
      <Page>
        <Column>
          <Card>
            <h1>Désinscription des actualités</h1>

            {!router.isReady ? (
              <p>Chargement…</p>
            ) : done ? (
              <>
                <Notice $tone="success">
                  Votre désinscription est bien prise en compte. Vous ne recevrez plus nos e-mails d&apos;actualités.
                </Notice>
                <p>
                  Vos éventuelles alertes sur vos producteurs suivis et les e-mails liés à votre compte ne sont pas
                  modifiés.
                </p>
                <Actions>
                  <LinkButton href="/" $variant="green">
                    Retour à l&apos;accueil
                  </LinkButton>
                </Actions>
              </>
            ) : hasLinkParams ? (
              <>
                <p>
                  En confirmant ci-dessous, vous ne recevrez plus les newsletters et actualités envoyées par Les Choux
                  d&apos;à Côté.
                </p>
                <p>Vos alertes sur vos producteurs suivis et les messages liés à votre compte restent inchangés.</p>
                {error && <Notice $tone="error">{error}</Notice>}
                <Actions>
                  <Button type="button" $variant="green" onClick={handleConfirm} disabled={submitting}>
                    {submitting ? "Enregistrement…" : "Confirmer ma désinscription"}
                  </Button>
                  <LinkButton href="/">Annuler</LinkButton>
                </Actions>
              </>
            ) : (
              <>
                <p>
                  Pour vous désinscrire des actualités des Choux d&apos;à Côté, utilisez le lien personnel situé en bas
                  de l&apos;e-mail reçu.
                </p>
                <p>
                  En cas de difficulté, écrivez-nous à{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} style={{ textDecoration: "underline" }}>
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
                <Actions>
                  <LinkButton href="/" $variant="green">
                    Retour à l&apos;accueil
                  </LinkButton>
                </Actions>
              </>
            )}
          </Card>
        </Column>
      </Page>
    </Layout>
  )
}

export default UnsubscribeNewsletterPage
