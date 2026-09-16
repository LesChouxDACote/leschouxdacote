import type { NextApiRequest, NextApiResponse } from "next"
import { badRequest, respond } from "src/helpers-api"
import { firestore, getObject, getToken, toMillis } from "src/helpers-api/firebase"
import { sendEmail } from "src/helpers-api/mail"
import { UNIT_LABELS } from "src/constants"
import { formatDate, getSlotEnd, getSlotKey } from "src/helpers/date"
import { validatePhoneNumber } from "src/helpers/validators"
import type { ReservationsResponse } from "src/models/Booking"
import type { Booking, Product, Unit, User } from "src/types/model"

interface ReservationPayload {
  productId: string
  slot: { date: number; heureDebut: string; heureFin: string }
  quantity: number
  phone: string
  email: string
}

interface ReservationErrors {
  slot?: string
  quantity?: string
  phone?: string
  email?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// getProduct normalise les dates des créneaux en ms (les Timestamps Firestore imbriqués dans
// slots ne sont pas convertis par getObject, qui ne traite que le premier niveau), d'où ce type
// local plutôt que Product.slots (date: Date côté client).
interface ApiSlot {
  date: number
  heureDebut: string
  heureFin: string
  reservation?: {
    totalQuantity: number
    maxQuantityPerPerson?: number | null
    instructions?: string | null
  } | null
}

interface ApiProduct extends Omit<Product, "slots"> {
  slots?: ApiSlot[]
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const getUnitLabel = (unit: Unit | null | undefined) => (unit ? UNIT_LABELS[unit] : "")

const getProduct = async (id: string) => {
  const doc = await firestore.collection("products").doc(id).get()
  if (!doc.exists) {
    return null
  }
  const product = getObject(doc) as ApiProduct
  // getObject ne convertit que les Timestamps de premier niveau : les dates des créneaux
  // arrivent donc en Timestamps bruts. Normalisation en ms, nécessaire pour la comparaison avec
  // la date envoyée par l'acheteur (POST) et pour la réponse GET. Valeur inattendue : 0 (créneau
  // traité comme passé).
  product.slots = (product.slots ?? []).map((slot) => ({ ...slot, date: toMillis(slot.date) ?? 0 }))
  return product
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ReservationsResponse | ApiResponse<ReservationErrors>>,
) => {
  if (req.method === "GET") {
    const productId = req.query.productId
    if (typeof productId !== "string" || !productId) {
      return badRequest(res)
    }
    const product = await getProduct(productId)
    if (!product) {
      return badRequest(res, 404)
    }

    const { docs } = await firestore.collection("bookings").where("productId", "==", productId).get()
    const bookings = docs.map((doc) => getObject(doc) as Booking).sort((a, b) => a.created - b.created)

    const booked: Record<string, number> = {}
    for (const booking of bookings) {
      const key = getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)
      booked[key] = (booked[key] ?? 0) + booking.quantity
    }

    const token = await getToken(req)
    const owner = Boolean(token && token.uid === product.uid)

    const body: ReservationsResponse = { owner, booked }
    if (owner) {
      // Informations personnelles des acheteurs et créneaux persistés : réservés au producteur
      // propriétaire (la page de gestion reflète l'annonce enregistrée, pas les modifications du
      // formulaire en cours).
      body.bookings = bookings
      body.slots = (product.slots ?? [])
        .filter(
          (slot): slot is ApiSlot & { reservation: NonNullable<ApiSlot["reservation"]> } => slot.reservation != null,
        )
        .sort((a, b) => a.date - b.date || a.heureDebut.localeCompare(b.heureDebut))
    }
    return res.status(200).json(body)
  }

  if (req.method === "POST") {
    const token = await getToken(req)
    if (!token) {
      return badRequest(res, 403)
    }

    const payload = req.body as ReservationPayload
    const product = payload.productId ? await getProduct(payload.productId) : null
    if (!product) {
      return badRequest(res, 404)
    }

    const slot = (product.slots ?? []).find(
      (item) =>
        item.date === payload.slot?.date &&
        item.heureDebut === payload.slot?.heureDebut &&
        item.heureFin === payload.slot?.heureFin,
    )
    const now = Date.now()
    const quantity = Number(payload.quantity)
    const phone = String(payload.phone ?? "").trim()
    const email = String(payload.email ?? "").trim()
    const unitLabel = getUnitLabel(product.unit)

    const errors: ReservationErrors = {}
    if (!slot) {
      errors.slot = "Ce créneau n'est plus disponible"
    } else if (slot.reservation == null) {
      errors.slot = "La réservation n'est plus active sur ce créneau"
    } else if (getSlotEnd(new Date(slot.date), slot.heureFin) < now) {
      errors.slot = "Ce créneau est passé"
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = "La quantité doit être un nombre entier supérieur à 0"
    } else if (slot?.reservation?.maxQuantityPerPerson != null && quantity > slot.reservation.maxQuantityPerPerson) {
      errors.quantity = `La quantité ne peut pas dépasser ${slot.reservation.maxQuantityPerPerson} ${unitLabel}`.trim()
    }
    if (!validatePhoneNumber(phone)) {
      errors.phone = "Désolé, le numéro de téléphone est invalide"
    }
    if (!EMAIL_REGEX.test(email)) {
      errors.email = "Adresse e-mail invalide"
    }
    if (Object.keys(errors).length > 0) {
      return respond<ReservationErrors>(res, errors)
    }
    if (!slot || slot.reservation == null) {
      // Déjà couvert par les erreurs ci-dessus : garde-fou (nécessaire au narrowing).
      return badRequest(res)
    }

    const userDoc = await firestore.collection("users").doc(token.uid).get()
    const user = getObject(userDoc) as User | null
    if (!user) {
      return badRequest(res, 403)
    }

    // La transaction rend le dépassement impossible si plusieurs acheteurs réservent le même
    // créneau en même temps.
    const bookingRef = firestore.collection("bookings").doc(`${payload.productId}_${token.uid}`)
    const { date: slotDate, heureDebut, heureFin } = payload.slot
    const totalQuantity = slot.reservation.totalQuantity
    let remaining = 0
    let wasUpdate = false

    await firestore.runTransaction(async (transaction) => {
      const existingDoc = await transaction.get(bookingRef)
      const existing = existingDoc.exists ? (getObject(existingDoc) as Booking) : null
      wasUpdate = existing != null

      const { docs } = await transaction.get(
        firestore.collection("bookings").where("productId", "==", payload.productId),
      )
      const booked = docs
        .filter((doc) => doc.id !== bookingRef.id)
        .map((doc) => getObject(doc) as Booking)
        .filter(
          (booking) =>
            booking.slotDate === slotDate && booking.heureDebut === heureDebut && booking.heureFin === heureFin,
        )
        .reduce((sum, booking) => sum + booking.quantity, 0)

      remaining = totalQuantity - booked
      if (quantity > remaining) {
        return
      }

      const booking: Omit<Booking, "objectID"> = {
        productId: payload.productId,
        uid: token.uid,
        slotDate,
        heureDebut,
        heureFin,
        quantity,
        phone,
        email,
        firstname: user.firstname,
        lastname: user.lastname,
        created: existing?.created ?? now,
      }
      if (existing) {
        booking.updated = now
      }
      transaction.set(bookingRef, booking)
    })

    if (quantity > remaining) {
      errors.quantity = [`Il ne reste que ${remaining}`, unitLabel, "pour ce créneau"].filter(Boolean).join(" ")
      return respond<ReservationErrors>(res, errors)
    }

    // E-mail au producteur, hors transaction : un échec d'envoi ne doit pas faire échouer la
    // réservation.
    const producerDoc = await firestore.collection("users").doc(product.uid).get()
    const producer = getObject(producerDoc) as User | null
    const recipient = producer?.email ?? product.email
    if (recipient) {
      const label = wasUpdate ? "Modification de réservation" : "Nouvelle réservation"
      const slotLabel = `Le ${formatDate(slotDate)} de ${heureDebut} à ${heureFin}`
      const quantityLabel = `${quantity} / ${totalQuantity}${unitLabel ? ` ${unitLabel}` : ""}`
      try {
        await sendEmail(
          recipient,
          `${label} — ${product.title}`,
          [
            `<p>${label} pour votre annonce <strong>${escapeHtml(product.title)}</strong>.</p>`,
            "<ul>",
            `<li>Créneau : ${slotLabel}</li>`,
            `<li>Quantité réservée : ${quantityLabel}</li>`,
            `<li>Réservé par : ${escapeHtml(user.firstname)} ${escapeHtml(user.lastname)}</li>`,
            `<li>Téléphone : ${escapeHtml(phone)}</li>`,
            `<li>E-mail : ${escapeHtml(email)}</li>`,
            "</ul>",
          ].join(""),
          [
            `${label} pour votre annonce « ${product.title} ».`,
            `Créneau : ${slotLabel}`,
            `Quantité réservée : ${quantityLabel}`,
            `Réservé par : ${user.firstname} ${user.lastname}`,
            `Téléphone : ${phone}`,
            `E-mail : ${email}`,
          ].join("\n"),
        )
      } catch (error) {
        console.error("reservation: échec de l'e-mail au producteur", error)
      }
    }

    return respond(res)
  }

  badRequest(res)
}

export default handler
