import type { NextApiRequest, NextApiResponse } from "next"
import { badRequest, respond } from "src/helpers-api"
import { firestore } from "src/helpers-api/firebase"
import { verifyUnsubscribeToken } from "src/helpers-api/newsletter"

interface Payload {
  token: string
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return badRequest(res)
  }

  const uid = typeof req.body?.uid === "string" ? req.body.uid.trim() : ""
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : ""

  if (!verifyUnsubscribeToken(uid, token)) {
    return respond<Payload>(res, { token: "Ce lien de désinscription est invalide ou incomplet." })
  }

  try {
    const ref = firestore.collection("users").doc(uid)
    const snap = await ref.get()
    if (!snap.exists) {
      return respond<Payload>(res, { token: "Compte introuvable." })
    }

    await ref.update({
      newsletterUnsubscribed: true,
      updated: new Date(),
    })
  } catch (error) {
    console.error("newsletter-unsubscribe: échec de la mise à jour", error)
    return respond<Payload>(res, { token: "Impossible d'enregistrer votre désinscription pour le moment." })
  }

  return respond(res)
}

export default handler
