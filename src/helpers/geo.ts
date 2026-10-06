import type { Geoloc } from "src/types/model"

const EARTH_RADIUS_KM = 6371

export const parseLatLng = (ll: string): Geoloc => {
  const [lat, lng] = ll.split(",").map(Number)
  return { lat, lng }
}

// Haversine distance, in km — only used to sort by proximity, not to display a value
export const distance = (a: Geoloc, b: Geoloc) => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
