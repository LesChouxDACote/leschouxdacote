import type { NextApiRequest, NextApiResponse } from "next"
import { USER_ROLE } from "src/constants"
import {
  buildNewsletterEmail,
  DEFAULT_SITE_URL,
  NEWSLETTER_CAMPAIGN_ID,
  NEWSLETTER_CAMPAIGN_START,
} from "src/constants/communication"
import { badRequest } from "src/helpers-api"
import { firestore, getObject } from "src/helpers-api/firebase"
import { describeMailError, listSentRecipientsSince, sendEmail } from "src/helpers-api/mail"
import {
  buildUnsubscribeUrl,
  EMAIL_PATTERN,
  getDeliveredUids,
  isDelivered,
  isHistoryImported,
  isNewsletterAdminAuthorized,
  markDelivered,
  markDeliveredMany,
  markHistoryImported,
} from "src/helpers-api/newsletter"
import type { User } from "src/types/model"

export type NewsletterAudience = "all" | "producers" | "buyers"

export interface NewsletterAudienceSummary {
  audience: NewsletterAudience
  count: number
  alreadySentCount: number
  unsubscribedCount: number
  recipientUids: string[]
  historyChecked: boolean
}

export interface NewsletterSendResult {
  ok: boolean
  sent: number
  skipped: number
  failed: number
  error?: string
}

// Un destinataire par appel : chaque appel reste bref, et un échec ne concerne qu'une personne.
const MAX_BATCH_SIZE = 1

export const config = { maxDuration: 60 }

const parseAudience = (value: unknown): NewsletterAudience | null => {
  if (value === "all" || value === "producers" || value === "buyers") {
    return value
  }
  return null
}

const matchesAudience = (user: User, audience: NewsletterAudience) => {
  if (audience === "producers") {
    return user.role === USER_ROLE.PRODUCER
  }
  if (audience === "buyers") {
    return user.role === USER_ROLE.BUYER
  }
  return user.role === USER_ROLE.PRODUCER || user.role === USER_ROLE.BUYER
}

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "")

// Premier chargement : relit l'historique du service d'envoi pour noter ceux qui ont déjà reçu la newsletter
// lors d'un envoi précédent. Renvoie false si cet historique n'a pas pu être lu.
const importHistory = async (users: User[]) => {
  // Dans l'Aperçu, aucun e-mail n'est jamais parti : il n'y a pas d'historique à relire.
  if (process.env.MAIL_RELAY_URL) {
    return true
  }
  if (await isHistoryImported(NEWSLETTER_CAMPAIGN_ID)) {
    return true
  }

  const fromTs = Math.floor(new Date(`${NEWSLETTER_CAMPAIGN_START}T00:00:00Z`).getTime() / 1000)
  const { subject } = buildNewsletterEmail(DEFAULT_SITE_URL)
  const sentEmails = await listSentRecipientsSince(fromTs, subject)
  if (!sentEmails) {
    return false
  }

  const matched = users
    .map((user) => ({ uid: user.objectID, email: normalizeEmail(user.email) }))
    .filter(({ email }) => email && sentEmails.has(email))
  await markDeliveredMany(NEWSLETTER_CAMPAIGN_ID, matched, "history")
  await markHistoryImported(NEWSLETTER_CAMPAIGN_ID, matched.length)
  return true
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (!(await isNewsletterAdminAuthorized(req))) {
    return res.status(403).json({
      errors: {
        audience: "L'envoi de la newsletter aux utilisateurs est réservé aux comptes administrateurs.",
      },
    })
  }

  if (req.method === "GET") {
    const audience = parseAudience(req.query.audience ?? "all")
    if (!audience) {
      return badRequest(res)
    }

    try {
      const snapshot = await firestore.collection("users").get()
      const users: User[] = []
      snapshot.forEach((doc) => {
        const user = getObject<User>(doc)
        if (user) {
          users.push(user)
        }
      })

      const historyChecked = await importHistory(users)
      const deliveredUids = await getDeliveredUids(NEWSLETTER_CAMPAIGN_ID)

      const seenEmails = new Set<string>()
      const recipientUids: string[] = []
      let unsubscribedCount = 0
      let alreadySentCount = 0

      users.forEach((user) => {
        if (user.isAdmin || !matchesAudience(user, audience)) {
          return
        }
        const email = normalizeEmail(user.email)
        if (!EMAIL_PATTERN.test(email) || seenEmails.has(email)) {
          return
        }
        seenEmails.add(email)
        if (deliveredUids.has(user.objectID)) {
          alreadySentCount += 1
          return
        }
        if (user.newsletterUnsubscribed) {
          unsubscribedCount += 1
          return
        }
        recipientUids.push(user.objectID)
      })

      const summary: NewsletterAudienceSummary = {
        audience,
        count: recipientUids.length,
        alreadySentCount,
        unsubscribedCount,
        recipientUids,
        historyChecked,
      }
      return res.status(200).json(summary)
    } catch (error) {
      console.error("newsletter-send: échec du chargement des destinataires", error)
      return res.status(500).json({ ok: false })
    }
  }

  if (req.method === "POST") {
    const rawUids = Array.isArray(req.body?.uids) ? req.body.uids : []
    const uids = rawUids
      .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_BATCH_SIZE)

    if (uids.length === 0) {
      return badRequest(res)
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || DEFAULT_SITE_URL
    const result: NewsletterSendResult = { ok: true, sent: 0, skipped: 0, failed: 0 }

    for (const uid of uids) {
      try {
        const doc = await firestore.collection("users").doc(uid).get()
        const user = getObject<User>(doc)
        const email = typeof user?.email === "string" ? user.email.trim() : ""

        if (
          !user ||
          user.isAdmin ||
          user.newsletterUnsubscribed ||
          !EMAIL_PATTERN.test(email) ||
          (await isDelivered(NEWSLETTER_CAMPAIGN_ID, uid))
        ) {
          result.skipped += 1
          continue
        }

        const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, user.objectID)
        const newsletter = buildNewsletterEmail(baseUrl, unsubscribeUrl)
        const outcome = await sendEmail(email, newsletter.subject, newsletter.html, newsletter.text)
        if (outcome.status !== "success") {
          result.failed += 1
          result.error = describeMailError({ ErrorMessage: (outcome as { errorMessage?: string }).errorMessage })
          continue
        }

        result.sent += 1
        try {
          await markDelivered(NEWSLETTER_CAMPAIGN_ID, uid, email.toLowerCase(), "send")
        } catch (error) {
          // L'e-mail est parti : on le compte envoyé, même si la note n'a pas pu être enregistrée.
          console.error(`newsletter-send: envoi non noté pour ${uid}`, error)
        }
      } catch (error) {
        console.error(`newsletter-send: échec d'envoi pour ${uid}`, error)
        result.failed += 1
        result.error = describeMailError(error)
      }
    }

    return res.status(200).json(result)
  }

  return badRequest(res)
}

export default handler
