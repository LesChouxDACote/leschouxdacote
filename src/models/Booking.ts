import type { Booking, Unit } from "src/types/model"

// Créneau réservable persisté d'une annonce (tel qu'enregistré dans Firestore, dates en
// timestamps ms — minuit UTC pour la date), renvoyé par les API de réservation.
export interface BookingSlot {
  date: number
  heureDebut: string
  heureFin: string
  reservation: {
    totalQuantity: number
    maxQuantityPerPerson?: number | null
    instructions?: string | null
  }
}

// Réponse de GET /api/reservation : les totaux par créneau sont publics (état « complet » visible
// côté acheteur), la liste détaillée (données personnelles) et les créneaux persistés ne sont
// renvoyés qu'au producteur propriétaire de l'annonce, et la réservation de l'appelant connecté
// uniquement à cet appelant (préremplissage du formulaire côté acheteur).
export interface ReservationsResponse {
  owner: boolean
  booked: Record<string, number> // clé = getSlotKey(date, heureDebut, heureFin)
  slots?: BookingSlot[]
  bookings?: Booking[]
  booking?: Booking // réservation de l'appelant connecté (absente s'il n'en a pas)
}

// Créneau réservé, relu dans l'annonce au moment de la réponse (consignes et quotas à jour).
// maxQuantityPerPerson peut être null (pas de limite par personne).
export interface BuyerReservationSlot {
  instructions: string | null
  totalQuantity: number
  maxQuantityPerPerson: number | null
}

// Annonce jointe à une réservation de l'acheteur (null si l'annonce a été supprimée : la
// réservation reste affichée, marquée « annonce indisponible »).
export interface BuyerReservationProduct {
  objectID: string
  uid: string // producteur
  title: string
  producer: string // nom du producteur (data fan-out)
  address: string
  city: string
  dpt: string
  email: string | null
  phone: string | null
  unit: Unit | null
  price: number // total de l'annonce, en cents
  quantity: number | null // quantité correspondant à price, dans l'unité de l'annonce
}

// Item de la liste « Mes réservations » de l'acheteur. remaining est le restant visible par tous
// (propre réservation incluse) : pour modifier sa réservation, l'acheteur peut viser jusqu'à
// remaining + booking.quantity (le serveur exclut de même sa réservation du calcul de quota).
export interface BuyerReservationItem {
  booking: Booking
  product: BuyerReservationProduct | null // null = annonce supprimée
  slot: BuyerReservationSlot | null // null = créneau retiré de l'annonce
  remaining: number | null
  isPast: boolean // créneau passé (jugé sur sa fin)
}

// Taille de page de la liste « Mes réservations ».
export const RESERVATIONS_PAGE_SIZE = 20

// Réponse de GET /api/my-reservations : les réservations de l'appelant, triées (créneaux à venir
// d'abord, du plus proche au plus lointain, puis les passés du plus récent au plus ancien) et
// paginées. page est bornée à la dernière page valide.
export interface MyReservationsResponse {
  items: BuyerReservationItem[]
  total: number
  page: number
  pageSize: number
}
