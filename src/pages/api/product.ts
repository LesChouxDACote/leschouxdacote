import { addDays } from "date-fns"
import { Schema as Sc } from "effect"
import type { NextApiRequest, NextApiResponse } from "next"
import { badRequest, respond } from "src/helpers-api"
import { productsIndex } from "src/helpers-api/algolia"
import { firestore, GeoPoint, getObject, getToken } from "src/helpers-api/firebase"
import { getFormData } from "src/helpers-api/form"
import { resize, upload } from "src/helpers-api/image"
import { normalizeNumber } from "src/helpers/validators"
import { SlotSchema } from "src/pages/compte/producteur/annonce"
import type { Producer, Product, ProductPayload, RegisteringProduct } from "src/types/model"

const checkRequired = (data: Record<string, any>, fields: string[]) => {
  const found = fields.find((field) => !data[field])
  if (found) {
    return {
      [found]: "Cette information est requise",
    }
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse<ApiResponse<RegisteringProduct>>) => {
  if (req.method === "POST" || req.method === "PUT") {
    const [fields, files] = await getFormData<ProductPayload>(req)

    const token = await getToken(req)
    if (!token || token.uid !== fields.uid) {
      return badRequest(res, 403)
    }

    const errors = checkRequired(fields, ["title", "price", "address", "description", "days"])
    if (errors) {
      return respond(res, errors)
    }
    if (!fields.placeId) {
      return respond(res, {
        address: "Vous devez sélectionner une adresse suggérée par Google dans la liste déroulante",
      })
    }
    if (!fields.email && !fields.phone) {
      return respond(res, {
        email: "Vous devez au moins spécifier une adresse e-mail ou un numéro de téléphone",
      })
    }
    const price = Math.round(fields.price * 100) // store cents
    if (isNaN(price) || price < 0 || !Number.isInteger(price)) {
      return respond(res, {
        price: "Prix invalide",
      })
    }

    const producerDoc = await firestore.collection("users").doc(fields.uid).get()
    if (!producerDoc.exists) {
      throw new Error("Producer not found: " + fields.uid)
    }
    const producer = getObject(producerDoc) as Producer

    let ref: FirebaseFirestore.DocumentReference
    let existing: Product | null
    if (req.method === "PUT") {
      if (!fields.id) {
        throw new Error("Missing product ID parameter")
      }
      ref = firestore.collection("products").doc(fields.id)
      const doc = await ref.get()
      if (!doc.exists) {
        throw new Error("Product not found: " + fields.id)
      }
      existing = getObject(doc) as Product
    } else {
      ref = firestore.collection("products").doc()
      existing = null
    }

    let photo: string
    if (files.photo?.size) {
      try {
        const resized = await resize(files.photo.filepath)
        photo = await upload(resized, ref.id)
      } catch (error) {
        return respond(res, {
          photo: error.message,
        })
      }
    } else if (existing) {
      photo = existing.photo
    } else {
      return respond(res, {
        photo: "La photo est requise",
      })
    }

    const now = new Date()
    const slots = Sc.decodeUnknownSync(Sc.Array(SlotSchema))(JSON.parse(fields.slots.toString()))
    const position = { lat: Number(fields.lat), lng: Number(fields.lng) }
    console.log(slots.map((a) => a))

    const product: RegisteringProduct = {
      created: existing ? new Date(existing.created) : now,
      uid: fields.uid,
      title: fields.title,
      quantity: Number(fields.quantity) || null,
      unit: fields.unit || null,
      price,
      address: fields.address,
      _geoloc: new GeoPoint(position.lat, position.lng),
      bio: Boolean(fields.bio),
      _tags: fields._tags ? fields._tags.split(",") : null,
      placeId: fields.placeId,
      city: fields.city,
      dpt: fields.dpt,
      description: fields.description,
      photo,
      email: fields.email || null,
      phone: fields.phone ? normalizeNumber(fields.phone) : null,
      expires: addDays(now, Number(fields.days)),
      views: existing?.views || 0,
      // data fan-out:
      producer: producer.name ?? "",
      slots,
    }

    if (existing) {
      product.updated = now
    }

    const record: Product = {
      ...product,
      objectID: ref.id,
      slots,
      created: product.created.getTime(),
      updated: product.updated?.getTime(),
      published: existing?.expires && existing.expires > now.getTime() ? existing.published : now.getTime(),
      expires: product.expires.getTime(),
      _geoloc: position,
    }

    await Promise.all([ref.set(product), productsIndex.saveObject(record)])

    return respond(res)
  }

  badRequest(res)
}

export default handler

export const config = {
  api: {
    bodyParser: false,
  },
}
