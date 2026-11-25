import Mailjet, { type Message as MailjetMessage, type SendEmailV3_1 } from "node-mailjet"
import { CONTACT_EMAIL } from "src/constants"

export enum MailjetTemplate {
  alert = 5997948,
  expired = 5997949,
}

const SENDER_NAME = "Les Choux d'à Côté"

type Message = Omit<SendEmailV3_1.Message, "From">

// Dans l'Aperçu de Kedalia (`scripts/kedalia-mail-relay`), MAIL_RELAY_URL pointe vers son capteur : le mail y est
// gardé, jamais envoyé. Partout ailleurs (Coolify, Vercel), la variable est absente et Mailjet envoie. Un modèle
// Mailjet n'a pas de rendu hors de Mailjet : le capteur en reçoit le numéro et les variables.
const getMessageText = (message: Message) =>
  message.TemplateID
    ? `Modèle Mailjet ${message.TemplateID}\n\n${JSON.stringify(message.Variables ?? {}, null, 2)}`
    : (message.TextPart ?? "")

const relay = async (message: Message) => {
  const to = message.To[0]
  const text = getMessageText(message)
  const res = await fetch(process.env.MAIL_RELAY_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MAIL_RELAY_TOKEN ?? ""}` },
    body: JSON.stringify({
      to: to.Email,
      toName: to.Name,
      subject: message.Subject ?? "",
      html: message.HTMLPart ?? "",
      text,
      fromName: SENDER_NAME,
    }),
  })
  if (!res.ok) throw new Error(`Relais de mail : ${res.status}`)
  return { to: to.Email, status: "success" }
}

const mailtrap = async (message: Message) => {
  const to = message.To[0]
  const res = await fetch(`https://sandbox.api.mailtrap.io/api/send/${process.env.MAILTRAP_INBOX_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MAILTRAP_TOKEN}`,
    },
    body: JSON.stringify({
      from: { email: CONTACT_EMAIL, name: SENDER_NAME },
      to: [{ email: to.Email, ...(to.Name ? { name: to.Name } : {}) }],
      subject: message.Subject ?? `Modèle Mailjet ${message.TemplateID ?? ""}`.trim(),
      text: getMessageText(message),
      ...(message.HTMLPart ? { html: message.HTMLPart } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Mailtrap : ${res.status}`)
  return { to: to.Email, status: "success" }
}

// Vrai quand les e-mails partent réellement par Mailjet (ni relais de l'Aperçu, ni Mailtrap, ni e2e).
const usesMailjet = () =>
  !process.env.MAIL_RELAY_URL &&
  !(process.env.MAILTRAP_TOKEN && process.env.MAILTRAP_INBOX_ID) &&
  process.env.E2E_DISABLE_REAL_MAIL !== "1"

const getMailjet = () =>
  new Mailjet({
    apiKey: process.env.MAILJET_PUBLIC_KEY as string,
    apiSecret: process.env.MAILJET_PRIVATE_KEY as string,
  })

const send = async (message: Message) => {
  if (process.env.MAIL_RELAY_URL) return relay(message)
  if (process.env.MAILTRAP_TOKEN && process.env.MAILTRAP_INBOX_ID) return mailtrap(message)
  if (process.env.E2E_DISABLE_REAL_MAIL === "1") return { to: message.To[0].Email, status: "success" }

  const mailjet = getMailjet()

  const { body } = await mailjet.post("send", { version: "v3.1" }).request<SendEmailV3_1.Response>({
    Messages: [{ From: { Email: CONTACT_EMAIL, Name: SENDER_NAME }, ...message }],
  })

  const infos = body.Messages[0]
  return {
    to: infos.To?.[0]?.Email ?? message.To[0].Email,
    status: infos.Status as string,
    errorMessage: infos.Errors?.[0]?.ErrorMessage,
  }
}

const pickString = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim()

// Traduit en français clair l'erreur renvoyée par le service d'envoi (Mailjet, relais ou Mailtrap).
export const describeMailError = (error: unknown): string => {
  const err = (error ?? {}) as Record<string, any>
  const data = err.response?.data ?? err.response?.body ?? {}
  const firstError = Array.isArray(data?.Messages) ? data.Messages[0]?.Errors?.[0] : undefined
  const status: number | undefined =
    [err.statusCode, err.response?.status, firstError?.StatusCode, data?.StatusCode].find(
      (value): value is number => typeof value === "number",
    ) ?? undefined
  const detail = pickString(firstError?.ErrorMessage, err.ErrorMessage, data?.ErrorMessage, err.ErrorInfo, err.message)
  const suffix = detail ? ` (${detail})` : ""

  if (status === 401) {
    return `le service d'envoi refuse l'accès : ses clés sont absentes ou invalides${suffix}`
  }
  if (status === 403) {
    return `le service d'envoi a suspendu ou bloqué le compte${suffix}`
  }
  if (status === 429) {
    return `limite d'envoi atteinte chez le service d'envoi, réessayez plus tard${suffix}`
  }
  if (status === 400) {
    return `adresse ou message refusé par le service d'envoi${suffix}`
  }
  if (typeof status === "number" && status >= 500) {
    return `le service d'envoi est momentanément indisponible${suffix}`
  }
  return detail ? `erreur du service d'envoi : ${detail}` : "erreur inconnue du service d'envoi"
}

const HISTORY_PAGE_SIZE = 1000
const HISTORY_MAX_PAGES = 20
const SENT_STATUSES = new Set(["sent", "opened", "clicked", "queued", "deferred", "unsub", "spam"])

// Adresses (en minuscules) auxquelles Mailjet a réellement remis un e-mail de cet objet depuis `fromTs` (secondes).
// Renvoie null quand Mailjet n'est pas la voie d'envoi ou que son historique ne peut pas être lu.
export const listSentRecipientsSince = async (fromTs: number, subject: string): Promise<Set<string> | null> => {
  if (!usesMailjet() || !process.env.MAILJET_PUBLIC_KEY || !process.env.MAILJET_PRIVATE_KEY) {
    return null
  }

  try {
    const mailjet = getMailjet()
    const recipients = new Set<string>()
    for (let page = 0; page < HISTORY_MAX_PAGES; page += 1) {
      const { body } = await mailjet.get("message", { version: "v3" }).request<MailjetMessage.GetMessagesResponse>(
        {},
        {
          FromTS: fromTs,
          ShowSubject: true,
          ShowContactAlt: true,
          Limit: HISTORY_PAGE_SIZE,
          Offset: page * HISTORY_PAGE_SIZE,
        },
      )
      const messages = body.Data ?? []
      messages.forEach((message) => {
        const status = String(message.Status ?? "").toLowerCase()
        const email = typeof message.ContactAlt === "string" ? message.ContactAlt.trim().toLowerCase() : ""
        if (email && message.Subject === subject && SENT_STATUSES.has(status)) {
          recipients.add(email)
        }
      })
      if (messages.length < HISTORY_PAGE_SIZE) {
        return recipients
      }
    }
    return recipients
  } catch (error) {
    console.error("mail: lecture de l'historique Mailjet impossible", error)
    return null
  }
}

export const sendTemplateEmail = (
  recipient: string,
  templateId: MailjetTemplate,
  variables: Record<string, any>,
  subject?: string,
) =>
  send({
    To: [{ Email: recipient }],
    TemplateLanguage: true,
    TemplateID: templateId,
    Variables: variables,
    Subject: subject,
  })

// E-mail simple (HTML + texte), sans template Mailjet.
export const sendEmail = (recipient: string, subject: string, html: string, text: string) =>
  send({
    To: [{ Email: recipient }],
    Subject: subject,
    HTMLPart: html,
    TextPart: text,
  })
