import { lighten } from "polished"

export const CONTACT_EMAIL = "contact@leschouxdacote.fr"
export const MAX_PUBLICATION_DAYS = 90

const BASE_COLORS = {
  white: "#ffffff",
  dark: "#101010",
  grey: "#a6a6a6",
  green: "#47D25B",
  red: "#DF3D3D",
  lightDark: "#272D3B",
  blue: "#0077CF",
}

export const COLORS = {
  ...BASE_COLORS,
  menu: "#4A4A4A",
  divider: "#666666",
  input: "#686666",
  border: "#D6D6D6",
  odd: "#F9F9F9",
  background: {
    success: "rgb(71, 210, 91, 10%)",
    info: "rgb(0, 119, 207, 10%)",
  },
  shadow: {
    light: "#0000001A",
    regular: "#0000004A",
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

// eslint-disable-next-line no-shadow
export enum USER_ROLE {
  PRODUCER = "PRODUCER",
  BUYER = "BUYER",
  ADMIN = "ADMIN",
}

export const BIO = "_bio"

export const SIZES = {
  price: 35,
  subtitle: 22,
  large: 19,
  card: 16,
  regular: 14,
  small: 12,
  tiny: 10,
}

export const LAYOUT = {
  maxWidth: 1100,
  formWidth: 500,
  mapPopupWidth: 250,
  mobile: 900,
  tablet: 1200,
}

export const FONT = "'Roboto', sans-serif"

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
