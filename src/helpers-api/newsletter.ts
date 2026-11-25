import { createHmac, timingSafeEqual } from "crypto"
import type { NextApiRequest } from "next"
import { firestore, getObject, getToken } from "src/helpers-api/firebase"
import type { User } from "src/types/model"

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getSigningSecret = () =>
  process.env.FIREBASE_PRIVATE_KEY || process.env.MAILJET_PRIVATE_KEY || "leschouxdacote-newsletter-preview"

export const createUnsubscribeToken = (uid: string) =>
  createHmac("sha256", getSigningSecret()).update(`newsletter-unsubscribe:${uid}`).digest("hex").slice(0, 32)

export const verifyUnsubscribeToken = (uid: string, token: string) => {
  if (!uid || !token) {
    return false
  }
  const expected = Buffer.from(createUnsubscribeToken(uid), "utf8")
  const provided = Buffer.from(token, "utf8")
  if (expected.length !== provided.length) {
    return false
  }
  return timingSafeEqual(expected, provided)
}

export const buildUnsubscribeUrl = (baseUrl: string, uid: string) => {
  const cleanBase = baseUrl.replace(/\/+$/, "")
  const token = createUnsubscribeToken(uid)
  return `${cleanBase}/desinscription-newsletter?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`
}

// Suivi des envois de newsletter : un document par campagne et par destinataire, dans une collection de premier
// niveau (refusée par défaut dans firestore.rules, lue et écrite uniquement par le SDK admin).
export const NEWSLETTER_DELIVERIES = "newsletterDeliveries"

export type DeliverySource = "send" | "history"

const deliveryDocId = (campaignId: string, uid: string) => `${campaignId}_${uid}`
const historyMarkerId = (campaignId: string) => `${campaignId}__history`

export const getDeliveredUids = async (campaignId: string) => {
  const snapshot = await firestore.collection(NEWSLETTER_DELIVERIES).where("campaignId", "==", campaignId).get()
  const uids = new Set<string>()
  snapshot.forEach((doc) => {
    const uid = doc.get("uid")
    if (typeof uid === "string" && uid) {
      uids.add(uid)
    }
  })
  return uids
}

export const isDelivered = async (campaignId: string, uid: string) =>
  (await firestore.collection(NEWSLETTER_DELIVERIES).doc(deliveryDocId(campaignId, uid)).get()).exists

export const markDelivered = (campaignId: string, uid: string, email: string, source: DeliverySource) =>
  firestore.collection(NEWSLETTER_DELIVERIES).doc(deliveryDocId(campaignId, uid)).set({
    campaignId,
    uid,
    email,
    sentAt: new Date(),
    source,
  })

// Écriture groupée (lots de 400, sous la limite de 500 opérations par lot de Firestore).
export const markDeliveredMany = async (
  campaignId: string,
  entries: { uid: string; email: string }[],
  source: DeliverySource,
) => {
  for (let index = 0; index < entries.length; index += 400) {
    const batch = firestore.batch()
    entries.slice(index, index + 400).forEach(({ uid, email }) => {
      batch.set(firestore.collection(NEWSLETTER_DELIVERIES).doc(deliveryDocId(campaignId, uid)), {
        campaignId,
        uid,
        email,
        sentAt: new Date(),
        source,
      })
    })
    await batch.commit()
  }
}

// Le marqueur n'a pas de champ « uid » : il n'est jamais compté comme un destinataire servi.
export const isHistoryImported = async (campaignId: string) =>
  (await firestore.collection(NEWSLETTER_DELIVERIES).doc(historyMarkerId(campaignId)).get()).exists

export const markHistoryImported = (campaignId: string, matched: number) =>
  firestore.collection(NEWSLETTER_DELIVERIES).doc(historyMarkerId(campaignId)).set({
    campaignId,
    historyImportedAt: new Date(),
    matched,
  })

export const isNewsletterAdminAuthorized = async (req: NextApiRequest) => {
  // Dans l'Aperçu Kedalia, les e-mails sont capturés localement et ne partent jamais vers Mailjet
  if (process.env.MAIL_RELAY_URL) {
    return true
  }

  const token = await getToken(req)
  if (!token) {
    return false
  }

  const userDoc = await firestore.collection("users").doc(token.uid).get()
  const currentUser = getObject(userDoc) as User | null
  return Boolean(currentUser?.isAdmin)
}
