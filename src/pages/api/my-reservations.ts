import type { NextApiRequest, NextApiResponse } from "next"
import { badRequest } from "src/helpers-api"
import { firestore, getObject, getToken, toMillis } from "src/helpers-api/firebase"
import { getSlotEnd, getSlotKey } from "src/helpers/date"
import type {
  BookingSlot,
  BuyerReservationItem,
  BuyerReservationProduct,
  MyReservationsResponse,
} from "src/models/Booking"
import { RESERVATIONS_PAGE_SIZE } from "src/models/Booking"
import type { Booking, Product } from "src/types/model"

// Annonce telle que lue depuis Firestore : les dates des créneaux (imbriquées) doivent être
// normalisées en ms via toMillis (getObject les laisse en { seconds }).
interface ApiProduct extends Omit<Product, "slots"> {
  slots?: BookingSlot[]
}

const getPage = (value: string | string[] | undefined) => {
  const page = Number(Array.isArray(value) ? value[0] : (value ?? 1))
  return Number.isInteger(page) && page > 0 ? page : 1
}

const compareSlots = (a: Booking, b: Booking) =>
  a.slotDate - b.slotDate || a.heureDebut.localeCompare(b.heureDebut) || a.heureFin.localeCompare(b.heureFin)

const getProductView = (product: ApiProduct): BuyerReservationProduct => ({
  objectID: product.objectID,
  uid: product.uid,
  title: product.title,
  producer: product.producer,
  address: product.address,
  city: product.city,
  dpt: product.dpt,
  email: product.email ?? null,
  phone: product.phone ?? null,
  unit: product.unit ?? null,
  price: product.price,
  quantity: product.quantity ?? null,
})

const handler = async (req: NextApiRequest, res: NextApiResponse<MyReservationsResponse | ApiResponse<never>>) => {
  if (req.method !== "GET") {
    return badRequest(res)
  }
  const token = await getToken(req)
  if (!token) {
    return badRequest(res, 403)
  }

  // Toutes les réservations de l'acheteur : le tri demandé (créneaux à venir d'abord) dépend de
  // l'heure courante et ne peut pas être délégué à Firestore. Volumes faibles, et la requête
  // mono-champ ne nécessite pas d'index composite.
  const { docs } = await firestore.collection("bookings").where("uid", "==", token.uid).get()
  const bookings = docs.map((doc) => getObject(doc) as Booking)

  const now = Date.now()
  const isPast = (booking: Booking) => getSlotEnd(new Date(booking.slotDate), booking.heureFin) < now
  // À venir : du plus proche au plus lointain ; passés : du plus récent au plus ancien.
  bookings.sort(
    (a, b) => Number(isPast(a)) - Number(isPast(b)) || (isPast(a) ? compareSlots(b, a) : compareSlots(a, b)),
  )

  const total = bookings.length
  const maxPage = Math.max(1, Math.ceil(total / RESERVATIONS_PAGE_SIZE))
  const page = Math.min(getPage(req.query.page), maxPage)
  const pageBookings = bookings.slice((page - 1) * RESERVATIONS_PAGE_SIZE, page * RESERVATIONS_PAGE_SIZE)

  // Jointures limitées à la page courante : annonces (titre, contact, prix…) et réservations des
  // mêmes annonces (restant par créneau). L'identifiant d'annonce étant l'ID du document, un
  // document absent (annonce supprimée) donne product: null.
  // Pas de Set itéré (cible es5) : dédoublonnage par includes, ≤ 20 annonces par page.
  const productIds: string[] = []
  for (const booking of pageBookings) {
    if (!productIds.includes(booking.productId)) {
      productIds.push(booking.productId)
    }
  }
  const products: Record<string, ApiProduct | null> = {}
  await Promise.all(
    productIds.map(async (productId) => {
      const product = getObject(await firestore.collection("products").doc(productId).get()) as ApiProduct | null
      if (product) {
        // toMillis obligatoire : les dates de créneaux imbriquées arrivent en { seconds } (0 = passé).
        product.slots = (product.slots ?? []).map((slot) => ({ ...slot, date: toMillis(slot.date) ?? 0 }))
      }
      products[productId] = product
    }),
  )

  // Totaux réservés par créneau sur les annonces de la page (lots de 10 : limite du filtre `in`
  // de Firestore), pour calculer le restant visible par tous.
  const booked: Record<string, number> = {} // clé = productId_slotKey
  for (let index = 0; index < productIds.length; index += 10) {
    const chunk = await firestore
      .collection("bookings")
      .where("productId", "in", productIds.slice(index, index + 10))
      .get()
    for (const doc of chunk.docs) {
      const booking = getObject(doc) as Booking
      const key = `${booking.productId}_${getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)}`
      booked[key] = (booked[key] ?? 0) + booking.quantity
    }
  }

  const items: BuyerReservationItem[] = pageBookings.map((booking) => {
    const product = products[booking.productId]
    const past = isPast(booking)
    const slotKey = getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)
    if (!product) {
      return { booking, product: null, slot: null, remaining: null, isPast: past }
    }
    // L'annonce existe mais le créneau réservé n'existe plus (ou réservation désactivée) :
    // réservation conservée, marquée « annonce indisponible ».
    const slot = (product.slots ?? []).find(
      (item) =>
        item.date === booking.slotDate && item.heureDebut === booking.heureDebut && item.heureFin === booking.heureFin,
    )
    if (!slot || slot.reservation == null) {
      return { booking, product: getProductView(product), slot: null, remaining: null, isPast: past }
    }
    const remaining = slot.reservation.totalQuantity - (booked[`${booking.productId}_${slotKey}`] ?? 0)
    return {
      booking,
      product: getProductView(product),
      slot: {
        instructions: slot.reservation.instructions ?? null,
        totalQuantity: slot.reservation.totalQuantity,
        maxQuantityPerPerson: slot.reservation.maxQuantityPerPerson ?? null,
      },
      remaining: Math.max(remaining, 0),
      isPast: past,
    }
  })

  return res.status(200).json({ items, total, page, pageSize: RESERVATIONS_PAGE_SIZE })
}

export default handler
