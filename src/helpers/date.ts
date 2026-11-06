import { addDays, differenceInCalendarDays, format } from "date-fns"
import { fr } from "date-fns/locale"

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
  const days = differenceInCalendarDays(ts, new Date())
  if (days <= 0) {
    return "aujourd’hui"
  }
  if (days === 1) {
    return "demain"
  }
  return `dans ${days} jours`
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

export const formatHours = (heure: string) => heure.replace(":", "h")

// « samedi 12 octobre, 10h–12h »
export const formatSlotDate = (date: Date, heureDebut: string, heureFin: string) =>
  `${formatDate(date, "EEEE d MMMM")}, ${formatHours(heureDebut)}–${formatHours(heureFin)}`

// « Samedi 8 novembre · 9h – 12h » (en-tête des cartes de « Mes réservations »)
export const formatSlotHeading = (date: Date | number, heureDebut: string, heureFin: string) => {
  const day = formatDate(date, "EEEE d MMMM")
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${formatHours(heureDebut)} – ${formatHours(heureFin)}`
}

// Repère « Aujourd’hui » / « Demain » d'un créneau : son jour (enregistré à minuit UTC, cf. getSlotEnd)
// comparé à la date du jour locale.
export const getSlotDayLabel = (date: Date | number, now = new Date()): "Aujourd’hui" | "Demain" | null => {
  const slot = new Date(date)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((Date.UTC(slot.getUTCFullYear(), slot.getUTCMonth(), slot.getUTCDate()) - today) / 86400000)
  if (days === 0) {
    return "Aujourd’hui"
  }
  if (days === 1) {
    return "Demain"
  }
  return null
}

// Annonce en ligne : publiée jusqu'à une date à venir (expires à null = désactivée), comme dans « Mes annonces ».
export const isProductActive = (expires: number | null | undefined, now: number) => (expires ? expires > now : false)

// Créneaux du plus proche au plus lointain (date, puis heure de début).
export const sortSlots = <T extends { date: Date; heureDebut: string }>(slots: readonly T[]): T[] =>
  [...slots].sort((a, b) => a.date.getTime() - b.date.getTime() || a.heureDebut.localeCompare(b.heureDebut))
