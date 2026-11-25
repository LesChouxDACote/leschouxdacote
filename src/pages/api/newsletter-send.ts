import type { NextApiRequest, NextApiResponse } from "next"
import { USER_ROLE } from "src/constants"
import { buildNewsletterEmail, DEFAULT_SITE_URL } from "src/constants/communication"
import { badRequest } from "src/helpers-api"
import { firestore, getObject } from "src/helpers-api/firebase"
import { sendEmail } from "src/helpers-api/mail"
import { buildUnsubscribeUrl, EMAIL_PATTERN, isNewsletterAdminAuthorized } from "src/helpers-api/newsletter"
import type { User } from "src/types/model"

export type NewsletterAudience = "all" | "producers" | "buyers"

const MAX_BATCH_SIZE = 20

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
      const seenEmails = new Set<string>()
      const recipientUids: string[] = []
      let unsubscribedCount = 0

      snapshot.forEach((doc) => {
        const user = getObject<User>(doc)
        if (!user || user.isAdmin || !matchesAudience(user, audience)) {
          return
        }
        const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : ""
        if (!EMAIL_PATTERN.test(email) || seenEmails.has(email)) {
          return
        }
        seenEmails.add(email)
        if (user.newsletterUnsubscribed) {
          unsubscribedCount += 1
          return
        }
        recipientUids.push(user.objectID)
      })

      return res.status(200).json({
        audience,
        count: recipientUids.length,
        unsubscribedCount,
        recipientUids,
      })
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
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const uid of uids) {
      try {
        const doc = await firestore.collection("users").doc(uid).get()
        const user = getObject<User>(doc)
        const email = typeof user?.email === "string" ? user.email.trim() : ""

        if (!user || user.isAdmin || user.newsletterUnsubscribed || !EMAIL_PATTERN.test(email)) {
          skipped += 1
          continue
        }

        const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, user.objectID)
        const newsletter = buildNewsletterEmail(baseUrl, unsubscribeUrl)
        await sendEmail(email, newsletter.subject, newsletter.html, newsletter.text)
        sent += 1
      } catch (error) {
        console.error(`newsletter-send: échec d'envoi pour ${uid}`, error)
        failed += 1
      }
    }

    return res.status(200).json({ ok: true, sent, skipped, failed })
  }

  return badRequest(res)
}

export default handler
