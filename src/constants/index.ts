import { lighten, transparentize } from "polished"
import type { Unit } from "src/types/model"

export const CONTACT_EMAIL = "contact@leschouxdacote.fr"
export const MAX_PUBLICATION_DAYS = 90

export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  l: "litre(s)",
  u: "pièce(s)",
}

// Palette unique de l'interface : un vert, un rouge, un bleu, trois gris (texte, texte discret, bordures)
const BASE_COLORS = {
  white: "#ffffff",
  text: "#1F1F1F",
  muted: "#6B6B6B",
  border: "#D6D6D6",
  green: "#2A7F39",
  red: "#DF3D3D",
  blue: "#0077CF",
}

export const COLORS = {
  ...BASE_COLORS,
  odd: "#F7F7F7",
  background: {
    success: transparentize(0.9, BASE_COLORS.green),
    info: transparentize(0.9, BASE_COLORS.blue),
  },
  shadow: {
    light: "#0000001A",
    regular: "#0000004A",
    overlay: "#0000004D",
  },
  producer: {
    link: {
      color: {
        default: BASE_COLORS.green,
        hover: lighten(0.2, BASE_COLORS.green),
      },
    },
  },
}

export enum USER_ROLE {
  PRODUCER = "PRODUCER",
  BUYER = "BUYER",
}

export const BIO = "_bio"

// Les quatre tailles de texte de l'interface (px)
export const SIZES = {
  title: 28,
  subtitle: 20,
  regular: 16,
  small: 13,
}

// Arrondi commun des boutons, champs, cartes, encadrés et fenêtres (px)
export const RADIUS = 4

export const LAYOUT = {
  maxWidth: 1100,
  formWidth: 500,
  mapPopupWidth: 250,
  mobile: 900,
  tablet: 1200,
}

export const FONT = "'Nunito', sans-serif"

export const SEARCH_RADIUS = {
  // meters, see https://www.algolia.com/doc/api-reference/api-parameters/aroundRadius/
  city: 50_000,
  dpt: 120_000,
  region: 300_000,
  country: 500_000,
}

// https://nextjs.org/docs/going-to-production#caching
export const SSR_CACHE_HEADER = "max-age=3600, s-maxage=60, stale-while-revalidate=86400"

// https://vercel.com/docs/concepts/next.js/incremental-static-regeneration
// https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration
export const ISR_REVALIDATE = 60 // seconds
