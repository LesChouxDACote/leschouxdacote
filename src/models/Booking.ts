import type { Booking } from "src/types/model"

// Réponse de GET /api/reservation : les totaux par créneau sont publics (état « complet » visible
// côté acheteur), la liste détaillée (données personnelles) n'est renvoyée qu'au producteur
// propriétaire de l'annonce.
export interface ReservationsResponse {
  owner: boolean
  booked: Record<string, number> // clé = getSlotKey(date, heureDebut, heureFin)
  bookings?: Booking[]
}
