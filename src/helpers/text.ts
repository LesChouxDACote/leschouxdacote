import { ProductEncoded } from "src/models/Product"
import type { Unit } from "src/types/model"

interface FormattedUnit {
  singular: string
  plural: string
}

const UNITS: Partial<Record<Unit, FormattedUnit>> = {
  u: {
    singular: "pièce",
    plural: "pièces",
  },
  l: {
    singular: "litre",
    plural: "litres",
  },
}

const getUnit = (unit: Unit, quantity = 1) => {
  const fUnit = UNITS[unit]
  if (fUnit) {
    return quantity > 1 ? fUnit.plural : fUnit.singular
  }
  return unit
}

export const formatAmount = (cents?: number) => {
  if (cents == null) {
    return ""
  }
  return (cents / 100).toFixed(2).replace(/(\d{1,3})\.(\d+)/g, "$1,$2 €")
}

export const formatPricePerUnit = ({ price, quantity, unit }: Pick<ProductEncoded, "price" | "quantity" | "unit">) => {
  if (price == null || !quantity) {
    return ""
  }
  if (unit === "g") {
    price = price * 1000
  }
  return `${formatAmount(price / quantity)} / ${unit === "g" ? "kg" : getUnit(unit || "u")}`
}

export const formatQuantity = ({ unit, quantity }: ProductEncoded) => {
  if (!quantity) {
    return ""
  }
  return `${String(quantity).replace(".", ",")} ${getUnit(unit || "u", quantity)}`
}

export const formatPrice = ({ price }: ProductEncoded) => formatAmount(price)

export const formatPhone = (num?: string) => {
  if (!num) {
    return "N/C"
  }
  return num.replace(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, "0$1 $2 $3 $4 $5") // French numbers
}

export const getMapsLink = ({ address }: { address?: string }) =>
  `https://www.google.com/maps/search/${encodeURIComponent(address ?? "")}`

export const getAbsoluteUrl = (path: string) => `${location.protocol}//${location.host}/${path}`

export const ellipsis = (text?: string, max = 20) => {
  if (!text) {
    return ""
  }
  if (text.length > max) {
    return text.substr(0, max - 3) + "…"
  }
  return text
}

export const s = (num: number) => (num > 1 ? "s" : "")
