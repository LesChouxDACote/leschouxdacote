import styled from "@emotion/styled"
import type { GetServerSideProps } from "next"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button, LinkButton } from "src/components/Button"
import { ValidationError } from "src/components/Form"
import { COLORS, LAYOUT, RADIUS, SIZES } from "src/constants"
import {
  ARTICLE_PATH,
  buildNewsletterEmail,
  COMMUNICATION_SCHEDULE,
  DEFAULT_SITE_URL,
  getSocialPosts,
} from "src/constants/communication"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import Layout from "src/layout"
import { Column, Page } from "src/layout/content"
import type {
  NewsletterAudienceSummary as AudienceSummary,
  NewsletterAudience,
  NewsletterSendResult,
} from "src/pages/api/newsletter-send"
import HttpError from "standard-http-error"

const IntroCard = styled.section`
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  padding: 24px;
  margin-bottom: 32px;
  h1 {
    margin: 0 0 8px;
  }
  p {
    margin: 0 0 16px;
  }
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`

const SectionTitle = styled.h2`
  margin: 40px 0 16px;
  font-size: ${SIZES.subtitle}px;
  color: ${COLORS.text};
`

const ScheduleGrid = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const ScheduleCard = styled.li`
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.border};
  border-left: 4px solid ${COLORS.green};
  border-radius: ${RADIUS}px;
  padding: 16px 20px;
`

const ScheduleHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
`

const DayBadge = styled.span`
  font-weight: 700;
  color: ${COLORS.green};
`

const ChannelBadge = styled.span`
  font-size: ${SIZES.small}px;
  color: ${COLORS.muted};
  background-color: ${COLORS.odd};
  padding: 2px 8px;
  border-radius: ${RADIUS}px;
`

const SmallMeta = styled.p`
  margin: 4px 0 0;
  font-size: ${SIZES.small}px;
  color: ${COLORS.muted};
`

const Card = styled.section`
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  padding: 24px;
  margin-bottom: 24px;
`

const CardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  h3 {
    margin: 0;
    color: ${COLORS.green};
    font-size: ${SIZES.subtitle}px;
  }
`

const InfoList = styled.div`
  background-color: ${COLORS.odd};
  border-radius: ${RADIUS}px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: ${SIZES.small}px;
  p {
    margin: 4px 0;
  }
`

const VariantBlock = styled.div`
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  margin-top: 16px;
  overflow: hidden;
`

const VariantHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background-color: ${COLORS.odd};
  border-bottom: 1px solid ${COLORS.border};
  font-weight: 600;
`

const CopyText = styled.pre`
  margin: 0;
  padding: 16px;
  font-family: inherit;
  font-size: ${SIZES.regular}px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background-color: ${COLORS.white};
`

const FieldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  margin-bottom: 12px;
  background-color: ${COLORS.odd};
`

const FieldText = styled.div`
  flex: 1;
  min-width: 220px;
  span {
    display: block;
    font-size: ${SIZES.small}px;
    color: ${COLORS.muted};
  }
`

const TabRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 20px 0 12px;
`

const PreviewFrame = styled.iframe`
  width: 100%;
  height: 760px;
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  background-color: #f4f8f4;
`

const TestForm = styled.form`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${COLORS.border};
  h3 {
    margin: 0 0 8px;
    font-size: ${SIZES.regular}px;
    color: ${COLORS.text};
  }
`

const InputGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
`

const EmailInput = styled.input`
  flex: 1;
  min-width: 240px;
  max-width: 380px;
  padding: 9px 12px;
  font-size: ${SIZES.regular}px;
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  color: ${COLORS.text};
  background-color: ${COLORS.white};
`

const StatusNotice = styled.p<{ $tone: "success" | "error" }>`
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: ${RADIUS}px;
  font-size: ${SIZES.small}px;
  background-color: ${({ $tone }) => ($tone === "success" ? COLORS.background.success : "#fdecec")};
  color: ${({ $tone }) => ($tone === "success" ? COLORS.green : COLORS.red)};
`

const BroadcastSection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${COLORS.border};
  h3 {
    margin: 0 0 8px;
    font-size: ${SIZES.regular}px;
    color: ${COLORS.text};
  }
`

const AudienceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

const CountBox = styled.div`
  margin-top: 12px;
  padding: 12px 16px;
  background-color: ${COLORS.odd};
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  font-size: ${SIZES.small}px;
  p {
    margin: 0;
  }
`

const ConfirmBox = styled.div`
  margin-top: 14px;
  padding: 16px;
  background-color: #fff9ec;
  border: 1px solid #e6c67c;
  border-radius: ${RADIUS}px;
  p {
    margin: 0 0 12px;
    font-size: ${SIZES.small}px;
  }
`

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 10px;
  background-color: ${COLORS.odd};
  border-radius: 999px;
  overflow: hidden;
  margin: 12px 0 8px;
`

const ProgressBarFill = styled.div<{ $percent: number }>`
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  height: 100%;
  background-color: ${COLORS.green};
  transition: width 200ms ease;
`

interface Props {
  isPreview: boolean
}

interface BroadcastProgress {
  total: number
  processed: number
  sent: number
  skipped: number
  failed: number
  stopped: boolean
  // Arrêt automatique après trop d'échecs consécutifs
  aborted: boolean
  lastError: string | null
}

const AUDIENCE_OPTIONS: { value: NewsletterAudience; label: string }[] = [
  { value: "all", label: "Tous les utilisateurs" },
  { value: "producers", label: "Producteurs uniquement" },
  { value: "buyers", label: "Acheteurs uniquement" },
]

// Un e-mail par appel, avec une courte pause : rien n'est coupé faute de temps et le service d'envoi n'est pas saturé.
const BATCH_SIZE = 1
const PAUSE_BETWEEN_SENDS_MS = 500
const MAX_CONSECUTIVE_FAILURES = 5

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`

const copyTextToClipboard = async (value: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

const CommunicationPlanPage = ({ isPreview }: Props) => {
  const { authUser, user } = useUser()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [newsletterTab, setNewsletterTab] = useState<"visual" | "text">("visual")
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  const [audience, setAudience] = useState<NewsletterAudience>("all")
  const [audienceSummary, setAudienceSummary] = useState<AudienceSummary | null>(null)
  const [loadingAudience, setLoadingAudience] = useState(false)
  const [audienceError, setAudienceError] = useState<string | null>(null)
  const [confirmingBroadcast, setConfirmingBroadcast] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState<BroadcastProgress | null>(null)
  const [failedUids, setFailedUids] = useState<string[]>([])
  const [audienceReloadKey, setAudienceReloadKey] = useState(0)
  const cancelBroadcastRef = useRef(false)

  const canBroadcast = isPreview || Boolean(user?.isAdmin)

  useEffect(() => {
    if (authUser?.email && !email) {
      setEmail(authUser.email)
    }
  }, [authUser?.email, email])

  useEffect(() => {
    if (!canBroadcast) {
      setAudienceSummary(null)
      setAudienceError(null)
      return
    }

    let cancelled = false
    setLoadingAudience(true)
    setAudienceError(null)
    setConfirmingBroadcast(false)

    api
      .get<AudienceSummary>("newsletter-send", { audience })
      .then((data) => {
        if (!cancelled) {
          setAudienceSummary(data)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAudienceSummary(null)
          if (error instanceof HttpError && error.code === 403) {
            setAudienceError("L'envoi aux utilisateurs est réservé aux comptes administrateurs.")
          } else {
            setAudienceError("Impossible de charger le nombre de destinataires pour le moment.")
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAudience(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [audience, canBroadcast, audienceReloadKey])

  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      cancelBroadcastRef.current = true
    },
    [],
  )

  const socialPosts = useMemo(() => getSocialPosts(DEFAULT_SITE_URL), [])
  const newsletter = useMemo(() => buildNewsletterEmail(DEFAULT_SITE_URL), [])
  const articlePublicUrl = `${DEFAULT_SITE_URL}${ARTICLE_PATH}`

  const handleCopy = async (key: string, value: string) => {
    try {
      await copyTextToClipboard(value)
      setCopiedKey(key)
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      setCopiedKey(null)
    }
  }

  const handleSendTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSendStatus(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setSendStatus({ tone: "error", text: "Veuillez renseigner une adresse e-mail." })
      return
    }

    setSending(true)
    try {
      await api.post("newsletter-preview", { email: trimmedEmail })
      setSendStatus({
        tone: "success",
        text: `E-mail d'essai généré pour ${trimmedEmail}. Dans l'Aperçu, ouvrez le bouton « E-mails » pour le consulter.`,
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        setSendStatus({ tone: "error", text: error.message })
      } else if (error instanceof HttpError && error.code === 403) {
        setSendStatus({
          tone: "error",
          text: "L'envoi d'un e-mail d'essai sur le site publié est réservé aux comptes administrateurs.",
        })
      } else {
        setSendStatus({
          tone: "error",
          text: "Impossible d'envoyer l'e-mail d'essai pour le moment. Veuillez réessayer.",
        })
      }
    } finally {
      setSending(false)
    }
  }

  const runBroadcast = async (uids: string[]) => {
    if (uids.length === 0) {
      return
    }

    cancelBroadcastRef.current = false
    setConfirmingBroadcast(false)
    setBroadcasting(true)
    setAudienceError(null)

    const progress: BroadcastProgress = {
      total: uids.length,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      stopped: false,
      aborted: false,
      lastError: null,
    }
    const failedNow: string[] = []
    let consecutiveFailures = 0

    setBroadcastProgress({ ...progress })
    setFailedUids([])

    for (let index = 0; index < uids.length; index += BATCH_SIZE) {
      if (cancelBroadcastRef.current) {
        progress.stopped = true
        break
      }

      const batch = uids.slice(index, index + BATCH_SIZE)
      let batchFailed = 0
      try {
        const result = (await api.post("newsletter-send", { uids: batch })) as unknown as NewsletterSendResult
        progress.sent += result.sent || 0
        progress.skipped += result.skipped || 0
        batchFailed = result.failed || 0
        if (batchFailed > 0) {
          progress.lastError = result.error || "erreur inconnue du service d'envoi"
        }
      } catch (error) {
        if (error instanceof HttpError && error.code === 403) {
          setAudienceError("L'envoi aux utilisateurs est réservé aux comptes administrateurs.")
          progress.stopped = true
          break
        }
        batchFailed = batch.length
        progress.lastError =
          error instanceof HttpError
            ? `le site n'a pas répondu correctement (erreur ${error.code})`
            : "la connexion au site a été perdue"
      }

      progress.processed += batch.length
      if (batchFailed > 0) {
        progress.failed += batchFailed
        failedNow.push(...batch)
        consecutiveFailures += batchFailed
      } else {
        consecutiveFailures = 0
      }

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        progress.stopped = true
        progress.aborted = true
        setBroadcastProgress({ ...progress })
        break
      }

      setBroadcastProgress({ ...progress })
      if (index + BATCH_SIZE < uids.length) {
        await wait(PAUSE_BETWEEN_SENDS_MS)
      }
    }

    setBroadcastProgress({ ...progress })
    setFailedUids(failedNow)
    setBroadcasting(false)
    setAudienceReloadKey((key) => key + 1)
  }

  const handleStartBroadcast = () => {
    if (audienceSummary) {
      runBroadcast(audienceSummary.recipientUids)
    }
  }

  const handleRetryFailed = () => {
    runBroadcast(failedUids)
  }

  const selectedAudienceLabel =
    AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label.toLowerCase() || "tous les utilisateurs"

  return (
    <Layout
      title="Plan de communication"
      description="Plan de communication, publications réseaux sociaux et newsletter pour le lancement de la réservation sur Les Choux d'à Côté."
      noindex
      fullWidth
    >
      <Page>
        <Column>
          <IntroCard>
            <h1>Plan de communication — Lancement de la réservation</h1>
            <p>
              Cette page dédiée (absente des menus et non indexée par les moteurs de recherche) regroupe votre
              calendrier de diffusion sur une semaine, les textes prêts à copier pour Facebook, Instagram, X et
              LinkedIn, ainsi que le modèle complet de votre newsletter.
            </p>
            <ActionRow>
              <LinkButton href={ARTICLE_PATH} $variant="green">
                Lire l&apos;article Actualité à partager
              </LinkButton>
              <Button type="button" onClick={() => handleCopy("article-url", articlePublicUrl)}>
                {copiedKey === "article-url" ? "Lien copié !" : "Copier le lien public de l'article"}
              </Button>
            </ActionRow>
          </IntroCard>

          <SectionTitle>1. Calendrier de publication (sur une semaine)</SectionTitle>
          <ScheduleGrid>
            {COMMUNICATION_SCHEDULE.map((step) => (
              <ScheduleCard key={step.day}>
                <ScheduleHeader>
                  <DayBadge>{step.day}</DayBadge>
                  <ChannelBadge>{step.channel}</ChannelBadge>
                </ScheduleHeader>
                <p style={{ margin: "0 0 6px" }}>{step.goal}</p>
                <SmallMeta>
                  <strong>Public :</strong> {step.audience}
                </SmallMeta>
                <SmallMeta>
                  <strong>Conseil :</strong> {step.tip}
                </SmallMeta>
              </ScheduleCard>
            ))}
          </ScheduleGrid>

          <SectionTitle>2. Publications pour les réseaux sociaux</SectionTitle>
          {socialPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <h3>{post.channel}</h3>
                <ChannelBadge>{post.audience}</ChannelBadge>
              </CardHeader>
              <InfoList>
                <p>
                  <strong>Angle :</strong> {post.angle}
                </p>
                <p>
                  <strong>Idée de visuel :</strong> {post.visualIdea}
                </p>
                {post.hashtags && (
                  <p>
                    <strong>Mots-dièse suggérés :</strong> {post.hashtags}
                  </p>
                )}
              </InfoList>
              {post.variants.map((variant) => (
                <VariantBlock key={variant.id}>
                  <VariantHeader>
                    <span>{variant.label}</span>
                    <Button type="button" $variant="green" onClick={() => handleCopy(variant.id, variant.text)}>
                      {copiedKey === variant.id ? "Copié !" : "Copier le texte"}
                    </Button>
                  </VariantHeader>
                  <CopyText>{variant.text}</CopyText>
                </VariantBlock>
              ))}
            </Card>
          ))}

          <SectionTitle>3. Modèle de newsletter</SectionTitle>
          <Card>
            <FieldRow>
              <FieldText>
                <span>Objet de l&apos;e-mail</span>
                <strong>{newsletter.subject}</strong>
              </FieldText>
              <Button type="button" onClick={() => handleCopy("newsletter-subject", newsletter.subject)}>
                {copiedKey === "newsletter-subject" ? "Copié !" : "Copier l'objet"}
              </Button>
            </FieldRow>

            <FieldRow>
              <FieldText>
                <span>Texte d&apos;aperçu (pré-en-tête)</span>
                {newsletter.preheader}
              </FieldText>
              <Button type="button" onClick={() => handleCopy("newsletter-preheader", newsletter.preheader)}>
                {copiedKey === "newsletter-preheader" ? "Copié !" : "Copier l'aperçu"}
              </Button>
            </FieldRow>

            <TabRow>
              <ActionRow>
                <Button
                  type="button"
                  $variant={newsletterTab === "visual" ? "green" : "white"}
                  onClick={() => setNewsletterTab("visual")}
                >
                  Aperçu visuel
                </Button>
                <Button
                  type="button"
                  $variant={newsletterTab === "text" ? "green" : "white"}
                  onClick={() => setNewsletterTab("text")}
                >
                  Texte brut
                </Button>
              </ActionRow>

              <ActionRow>
                <Button type="button" onClick={() => handleCopy("newsletter-text", newsletter.text)}>
                  {copiedKey === "newsletter-text" ? "Copié !" : "Copier le texte brut"}
                </Button>
                <Button type="button" $variant="green" onClick={() => handleCopy("newsletter-html", newsletter.html)}>
                  {copiedKey === "newsletter-html" ? "Copié !" : "Copier la mise en page HTML"}
                </Button>
              </ActionRow>
            </TabRow>

            {newsletterTab === "visual" ? (
              <PreviewFrame srcDoc={newsletter.html} title="Aperçu de la newsletter" sandbox="" />
            ) : (
              <VariantBlock>
                <CopyText>{newsletter.text}</CopyText>
              </VariantBlock>
            )}

            <TestForm onSubmit={handleSendTest}>
              <h3>Envoyer un e-mail d&apos;essai de la newsletter</h3>
              <SmallMeta>
                Testez le rendu réel de cet e-mail. Dans l&apos;Aperçu Kedalia, l&apos;e-mail est capturé sous le bouton
                « E-mails » sans être envoyé vers l&apos;extérieur. Une fois le site publié, cet envoi est réservé aux
                comptes administrateurs.
              </SmallMeta>
              <InputGroup>
                <EmailInput
                  type="email"
                  aria-label="Adresse e-mail de destination"
                  placeholder="exemple@domaine.fr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Button type="submit" $variant="green" disabled={sending}>
                  {sending ? "Envoi en cours…" : "Envoyer un e-mail d'essai"}
                </Button>
              </InputGroup>
              {sendStatus && <StatusNotice $tone={sendStatus.tone}>{sendStatus.text}</StatusNotice>}
            </TestForm>

            <BroadcastSection>
              <h3>Envoyer la newsletter aux utilisateurs des Choux d&apos;à Côté</h3>
              <SmallMeta>
                Chaque destinataire reçoit un lien personnel en bas de l&apos;e-mail pour se désinscrire des futures
                actualités. Les personnes déjà désinscrites sont automatiquement exclues.
              </SmallMeta>

              {!canBroadcast ? (
                <CountBox>
                  <p>
                    Cet envoi est réservé aux comptes administrateurs. Connectez-vous avec un compte administrateur pour
                    voir le nombre de destinataires et lancer la diffusion.
                  </p>
                </CountBox>
              ) : (
                <>
                  <AudienceRow role="group" aria-label="Destinataires de la newsletter">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        $variant={audience === option.value ? "green" : "white"}
                        disabled={broadcasting}
                        onClick={() => {
                          setAudience(option.value)
                          setBroadcastProgress(null)
                          setFailedUids([])
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </AudienceRow>

                  <CountBox>
                    {loadingAudience ? (
                      <p>Calcul du nombre de destinataires…</p>
                    ) : audienceSummary ? (
                      <p>
                        Pour « {selectedAudienceLabel} » :{" "}
                        <strong>
                          {plural(audienceSummary.alreadySentCount, "personne")} l&apos;
                          {audienceSummary.alreadySentCount > 1 ? "ont" : "a"} déjà reçue
                        </strong>
                        ,{" "}
                        <strong>
                          {audienceSummary.count} l&apos;{audienceSummary.count > 1 ? "attendent" : "attend"} encore
                        </strong>
                        {audienceSummary.unsubscribedCount > 0 &&
                          ` (${plural(audienceSummary.unsubscribedCount, "personne")} ${audienceSummary.unsubscribedCount > 1 ? "désinscrites exclues" : "désinscrite exclue"})`}
                        .
                      </p>
                    ) : (
                      <p>Sélectionnez un groupe pour afficher le nombre de destinataires.</p>
                    )}
                  </CountBox>

                  {audienceError && <StatusNotice $tone="error">{audienceError}</StatusNotice>}

                  {!confirmingBroadcast && !broadcasting && (
                    <InputGroup>
                      <Button
                        type="button"
                        $variant="green"
                        disabled={loadingAudience || !audienceSummary || audienceSummary.count === 0}
                        onClick={() => setConfirmingBroadcast(true)}
                      >
                        {!audienceSummary
                          ? "Envoyer la newsletter"
                          : audienceSummary.count === 0
                            ? "Tout le monde a déjà reçu la newsletter"
                            : audienceSummary.count > 1
                              ? `Envoyer la newsletter aux ${audienceSummary.count} personnes qui ne l'ont pas encore reçue`
                              : "Envoyer la newsletter à la personne qui ne l'a pas encore reçue"}
                      </Button>
                    </InputGroup>
                  )}

                  {confirmingBroadcast && audienceSummary && (
                    <ConfirmBox>
                      <p>
                        Vous êtes sur le point d&apos;envoyer cette newsletter à{" "}
                        <strong>
                          {audienceSummary.count} destinataire{audienceSummary.count > 1 ? "s" : ""}
                        </strong>{" "}
                        ({selectedAudienceLabel}).{" "}
                        {isPreview
                          ? "Dans l'Aperçu, tous les e-mails sont capturés localement sous « E-mails » et ne partent jamais vers les utilisateurs."
                          : "Une fois confirmé, les e-mails partiront un par un : gardez cette page ouverte pendant l'envoi. Vous pourrez l'interrompre et le reprendre plus tard sans doublon."}
                      </p>
                      {!audienceSummary.historyChecked && (
                        <StatusNotice $tone="error">
                          Attention : l&apos;historique du service d&apos;envoi n&apos;a pas pu être lu. Les personnes
                          qui auraient reçu la newsletter lors de l&apos;envoi précédent ne sont donc pas connues, et
                          pourraient la recevoir une seconde fois.
                        </StatusNotice>
                      )}
                      <ActionRow>
                        <Button type="button" $variant="green" onClick={handleStartBroadcast}>
                          Confirmer l&apos;envoi
                        </Button>
                        <Button type="button" onClick={() => setConfirmingBroadcast(false)}>
                          Annuler
                        </Button>
                      </ActionRow>
                    </ConfirmBox>
                  )}

                  {broadcastProgress && (
                    <div style={{ marginTop: 12 }}>
                      <ProgressBarTrack>
                        <ProgressBarFill
                          $percent={
                            broadcastProgress.total > 0
                              ? Math.round((broadcastProgress.processed / broadcastProgress.total) * 100)
                              : 0
                          }
                        />
                      </ProgressBarTrack>
                      {broadcasting ? (
                        <ActionRow>
                          <SmallMeta style={{ margin: 0 }}>
                            Envoi progressif en cours : {broadcastProgress.processed} / {broadcastProgress.total} (
                            {broadcastProgress.sent} envoyé{broadcastProgress.sent > 1 ? "s" : ""})…
                          </SmallMeta>
                          <Button
                            type="button"
                            $variant="red"
                            onClick={() => {
                              cancelBroadcastRef.current = true
                            }}
                          >
                            Interrompre l&apos;envoi
                          </Button>
                        </ActionRow>
                      ) : (
                        <>
                          <StatusNotice
                            $tone={broadcastProgress.failed > 0 || broadcastProgress.stopped ? "error" : "success"}
                          >
                            {broadcastProgress.aborted
                              ? `Envoi arrêté après ${MAX_CONSECUTIVE_FAILURES} échecs de suite : ${broadcastProgress.lastError}. `
                              : broadcastProgress.stopped
                                ? "Envoi interrompu : "
                                : "Envoi terminé : "}
                            {plural(broadcastProgress.sent, "e-mail")} envoyé{broadcastProgress.sent > 1 ? "s" : ""}
                            {broadcastProgress.skipped > 0 &&
                              `, ${broadcastProgress.skipped} ignoré${broadcastProgress.skipped > 1 ? "s" : ""}`}
                            {broadcastProgress.failed > 0 && `, ${broadcastProgress.failed} en échec`}.
                            {!broadcastProgress.aborted &&
                              broadcastProgress.lastError &&
                              ` Raison du dernier échec : ${broadcastProgress.lastError}.`}
                            {isPreview ? " Consultez-les sous le bouton « E-mails » de l'Aperçu." : ""}
                          </StatusNotice>
                          {failedUids.length > 0 && (
                            <ActionRow>
                              <Button type="button" $variant="green" onClick={handleRetryFailed}>
                                Relancer les échecs
                              </Button>
                            </ActionRow>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </BroadcastSection>
          </Card>
        </Column>
      </Page>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async () => ({
  props: {
    isPreview: Boolean(process.env.MAIL_RELAY_URL),
  },
})

export default CommunicationPlanPage
