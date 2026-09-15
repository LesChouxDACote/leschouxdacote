import { addDays, differenceInCalendarDays, format } from "date-fns"
import fr from "date-fns/locale/fr"

export const formatDate = (ts: number | Date | null, pattern = "do MMMM yyyy") => {
  if (!ts) {
    return ""
  }
  return format(ts, pattern, { locale: fr }).replace("ème", "")
}

export const formatDateTime = (date: number | Date | null | undefined) => {
  if (!date) {
    return ""
  }
  return formatDate(date, "do MMMM yyyy à HH:mm")
}

export const daysFromNow = (ts: number | Date | null | undefined) => {
  if (!ts) {
    return ""
  }
  return `dans ${differenceInCalendarDays(ts, new Date())} jours`
}

export const formatEnd = (days: number, start?: number | Date | null) => {
  const end = addDays(start || new Date(), days)
  return formatDateTime(end)
}

// La date d'un créneau est à minuit UTC (input date "YYYY-MM-DD") : un créneau n'est passé
// qu'après sa fin réelle (date + heure de fin), et pas à minuit.
export const getSlotEnd = (date: Date, heureFin: string) => {
  const day = date.toISOString().slice(0, 10)
  return new Date(`${day}T${heureFin}`).getTime()
}

// Identifiant stable d'un créneau au sein d'une annonce (clé des totaux de réservation).
export const getSlotKey = (date: Date, heureDebut: string, heureFin: string) =>
  `${date.getTime()}_${heureDebut}_${heureFin}`
