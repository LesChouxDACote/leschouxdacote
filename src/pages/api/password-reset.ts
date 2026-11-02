import type { NextApiRequest, NextApiResponse } from "next"
import { CONTACT_EMAIL } from "src/constants"
import { badRequest, respond } from "src/helpers-api"
import { auth } from "src/helpers-api/firebase"
import { sendEmail } from "src/helpers-api/mail"

interface Payload {
  email: string
}

const SEND_ERROR = `L'e-mail n'a pas pu être envoyé, réessayez plus tard ou écrivez-nous à ${CONTACT_EMAIL}`

// Lien vers la page du site (et non celle de Firebase) : les gestionnaires de mots de passe
// enregistrent ainsi le nouveau mot de passe pour le domaine de l'application.
const getResetUrl = (firebaseLink: string) => {
  const oobCode = new URL(firebaseLink).searchParams.get("oobCode") as string
  const baseUrl = (process.env.NEXT_PUBLIC_URL as string).replace(/\/+$/, "")
  return `${baseUrl}/nouveau-mot-de-passe?oobCode=${encodeURIComponent(oobCode)}`
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const { email } = req.body as Payload

    let link: string
    try {
      await auth.getUserByEmail(email)
      link = await auth.generatePasswordResetLink(email)
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        return respond<Payload>(res, { email: "Adresse e-mail invalide" })
      }
      if (error.code === "auth/user-not-found" || error.code === "auth/email-not-found") {
        return respond<Payload>(res, { email: "Adresse e-mail inconnue" })
      }
      console.error("password-reset: échec de la génération du lien", error)
      return respond<Payload>(res, { email: SEND_ERROR })
    }

    // Un échec d'envoi (clés Mailjet absentes, URL publique manquante…) revient en erreur de champ
    // lisible plutôt qu'en erreur 500 ; la cause reste dans les logs du serveur
    try {
      const url = getResetUrl(link)
      await sendEmail(
        email,
        "Réinitialisation de votre mot de passe",
        [
          "<p>Bonjour,</p>",
          "<p>Vous avez demandé à changer votre mot de passe sur Les Choux d'à Côté.</p>",
          `<p><a href="${url}">Réinitialiser votre mot de passe.</a></p>`,
          "<p>Ce lien est valable une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>",
          "<p>L'équipe des Choux d'à Côté</p>",
        ].join(""),
        [
          "Bonjour,",
          "Vous avez demandé à changer votre mot de passe sur Les Choux d'à Côté.",
          `Réinitialiser votre mot de passe : ${url}`,
          "Ce lien est valable une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
          "L'équipe des Choux d'à Côté",
        ].join("\n\n"),
      )
    } catch (error) {
      console.error("password-reset: échec de l'envoi de l'e-mail", error)
      return respond<Payload>(res, { email: SEND_ERROR })
    }

    return respond(res)
  }

  badRequest(res)
}

export default handler
