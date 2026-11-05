import type { NextApiRequest, NextApiResponse } from "next"
import { badRequest, respond } from "src/helpers-api"
import { productsIndex } from "src/helpers-api/algolia"
import { FieldValue, firestore, getObject, getToken } from "src/helpers-api/firebase"
import type { Product } from "src/types/model"

interface Payload {
  id: string
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const { id } = (req.body || {}) as Partial<Payload>
    if (!id || typeof id !== "string") {
      return badRequest(res)
    }

    const ref = firestore.collection("products").doc(id)
    const doc = await ref.get()

    if (!doc.exists) {
      return badRequest(res, 404)
    }

    const product = getObject(doc) as Product

    // Jeton absent ou invalide : visiteur anonyme
    const token = await (getToken(req) || Promise.resolve(null)).catch(() => null)
    if (token && token.uid === product.uid) {
      // Le producteur qui regarde sa propre annonce ne compte pas
      return respond(res)
    }

    await Promise.all([
      ref.update({
        views: FieldValue.increment(1),
      }),
      productsIndex.partialUpdateObject({
        objectID: id,
        views: (product.views || 0) + 1,
      }),
    ])

    return respond(res)
  }

  badRequest(res)
}

export default handler
