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
