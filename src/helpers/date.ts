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
