import type { Booking } from "src/types/model"

// Créneau réservable persisté d'une annonce (tel qu'enregistré dans Firestore), renvoyé par
// GET /api/reservation au producteur propriétaire. La date est un timestamp en ms (minuit UTC).
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
