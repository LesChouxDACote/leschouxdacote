import Mailjet, { type SendEmailV3_1 } from "node-mailjet"
import { CONTACT_EMAIL } from "src/constants"

export enum MailjetTemplate {
  alert = 5997948,
  expired = 5997949,
}

const send = async (message: Omit<SendEmailV3_1.Message, "From">) => {
  const mailjet = new Mailjet({
    apiKey: process.env.MAILJET_PUBLIC_KEY as string,
    apiSecret: process.env.MAILJET_PRIVATE_KEY as string,
  })

  const { body } = await mailjet.post("send", { version: "v3.1" }).request<SendEmailV3_1.Response>({
    Messages: [{ From: { Email: CONTACT_EMAIL, Name: "Les Choux d'à Côté" }, ...message }],
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
