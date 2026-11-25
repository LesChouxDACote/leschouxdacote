import type { NextApiRequest, NextApiResponse } from "next"
import { CONTACT_EMAIL } from "src/constants"
import { buildNewsletterEmail, DEFAULT_SITE_URL } from "src/constants/communication"
import { badRequest, respond } from "src/helpers-api"
import { sendEmail } from "src/helpers-api/mail"
import { EMAIL_PATTERN, isNewsletterAdminAuthorized } from "src/helpers-api/newsletter"

interface Payload {
  email: string
}

const SEND_ERROR = `L'e-mail d'essai n'a pas pu être envoyé, réessayez plus tard ou écrivez-nous à ${CONTACT_EMAIL}`

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return badRequest(res)
  }

  if (!(await isNewsletterAdminAuthorized(req))) {
    return res.status(403).json({
      errors: {
        email: "L'envoi d'un e-mail d'essai est réservé aux comptes administrateurs.",
      },
    })
  }

  const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : ""
  if (!EMAIL_PATTERN.test(rawEmail)) {
    return respond<Payload>(res, { email: "Adresse e-mail invalide" })
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || DEFAULT_SITE_URL
  const newsletter = buildNewsletterEmail(baseUrl)

  try {
    await sendEmail(rawEmail, newsletter.subject, newsletter.html, newsletter.text)
  } catch (error) {
    console.error("newsletter-preview: échec de l'envoi de l'e-mail", error)
    return respond<Payload>(res, { email: SEND_ERROR })
  }

  return respond(res)
}

export default handler
