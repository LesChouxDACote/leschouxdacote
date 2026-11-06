import type { NextApiRequest, NextApiResponse } from "next"
import { USER_ROLE } from "src/constants"
import { badRequest, respond } from "src/helpers-api"
import getCsv from "src/helpers-api/csv"
import { FieldValue, firestore, getObject, getToken } from "src/helpers-api/firebase"
import { isFollowed } from "src/helpers/user"
import type { FollowedProducer, Follower, FollowerInfo, Producer, User } from "src/types/model"

interface FollowPayload {
  producerUid: string
  follow: boolean
}

interface EmailPayload {
  producerUid: string
  active: boolean
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const token = await getToken(req)
  if (!token) {
    return badRequest(res, 403)
  }

  // Abonnés du producteur connecté (prénom, nom, e-mail), en JSON ou en CSV (?format=csv)
  if (req.method === "GET") {
    const producer = getObject<Producer>(await firestore.collection("users").doc(token.uid).get())
    if (!producer || producer.role !== USER_ROLE.PRODUCER) {
      return badRequest(res, 403)
    }

    const uids = Object.keys(producer.followers || {})
    const docs = uids.length ? await firestore.getAll(...uids.map((uid) => firestore.collection("users").doc(uid))) : []
    const followers: FollowerInfo[] = docs
      .map((doc) => getObject<User>(doc))
      .filter((user): user is User => user !== null)
      .map(({ objectID, firstname, lastname, email }) => ({ objectID, firstname, lastname, email }))
      .sort(
        (a, b) =>
          (a.lastname || "").localeCompare(b.lastname || "", "fr") ||
          (a.firstname || "").localeCompare(b.firstname || "", "fr"),
      )

    if (req.query.format === "csv") {
      const output = await getCsv(
        followers.map(({ firstname, lastname, email }) => [firstname, lastname, email]),
        ["Prénom", "Nom", "E-mail"],
      )
      res.setHeader("Content-Type", "text/csv")
      return res.status(200).send(output)
    }

    return res.status(200).json({ followers })
  }

  if (req.method === "POST") {
    const fields = req.body as FollowPayload

    const producerDocRef = firestore.collection("users").doc(fields.producerUid)
    const producerDoc = await producerDocRef.get()
    if (!producerDoc.exists) {
      throw new Error("Producer not found: " + fields.producerUid)
    }
    const producer = getObject(producerDoc) as Producer

    const userDocRef = firestore.collection("users").doc(token.uid)
    const userDoc = await userDocRef.get()
    const user = getObject(userDoc) as User

    const followed = isFollowed(fields.producerUid, user)

    if (fields.follow === followed) {
      // already up to date (e.g. late query)
      return respond(res)
    }

    if (fields.follow) {
      const item: FollowedProducer = {
        emailAlert: true,
        name: producer.name, // TODO: keep in sync with name updates (use double data fan-out)
        address: producer.address,
      }
      const follower: Follower = {
        emailAlert: true,
      }
      await Promise.all([
        userDocRef.update({
          [`followedProducers.${fields.producerUid}`]: item,
        }),
        producerDocRef.update({
          [`followers.${token.uid}`]: follower,
        }),
      ])
    } else {
      await Promise.all([
        userDocRef.update({
          [`followedProducers.${fields.producerUid}`]: FieldValue.delete(),
        }),
        producerDocRef.update({
          [`followers.${token.uid}`]: FieldValue.delete(),
        }),
      ])
    }

    return respond(res)
  }

  if (req.method === "PUT") {
    const fields = req.body as EmailPayload

    const userDocRef = firestore.collection("users").doc(token.uid)
    const producerDocRef = firestore.collection("users").doc(fields.producerUid)

    await Promise.all([
      userDocRef.update({
        [`followedProducers.${fields.producerUid}.emailAlert`]: fields.active,
      }),
      producerDocRef.update({
        [`followers.${token.uid}.emailAlert`]: fields.active,
      }),
    ])

    return respond(res)
  }

  badRequest(res)
}

export default handler
