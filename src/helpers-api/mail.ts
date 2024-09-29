import { connect, Email } from "node-mailjet"
import { CONTACT_EMAIL } from "src/constants"

export enum MailjetTemplate {
  alert = 5997948,
  expired = 5997949,
}

export const sendTemplateEmail = async (
  recipient: string,
  templateId: MailjetTemplate,
  variables: Record<string, any>,
  subject?: string,
) => {
  const mailjet = connect(process.env.MAILJET_PUBLIC_KEY as string, process.env.MAILJET_PRIVATE_KEY as string)

  const message: Email.SendParamsMessage = {
    From: { Email: CONTACT_EMAIL, Name: "Les Choux d'à Côté" },
    To: [{ Email: recipient }],
    TemplateLanguage: true,
    TemplateID: templateId,
    Variables: variables,
    Subject: subject,
  }

  const { body } = await mailjet.post("send", { version: "v3.1" }).request({ Messages: [message] })

  const infos = body.Messages[0]
  return { to: infos.To[0].Email, status: infos.Status }
}
