import Mailjet, { type SendEmailV3_1 } from "node-mailjet"
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
const relay = async (message: Message) => {
  const to = message.To[0]
  const text = message.TemplateID
    ? `Modèle Mailjet ${message.TemplateID}\n\n${JSON.stringify(message.Variables ?? {}, null, 2)}`
    : (message.TextPart ?? "")
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

const send = async (message: Message) => {
  if (process.env.MAIL_RELAY_URL) return relay(message)

  const mailjet = new Mailjet({
    apiKey: process.env.MAILJET_PUBLIC_KEY as string,
    apiSecret: process.env.MAILJET_PRIVATE_KEY as string,
  })

  const { body } = await mailjet.post("send", { version: "v3.1" }).request<SendEmailV3_1.Response>({
    Messages: [{ From: { Email: CONTACT_EMAIL, Name: SENDER_NAME }, ...message }],
  })

  const infos = body.Messages[0]
  return { to: infos.To[0].Email, status: infos.Status }
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
