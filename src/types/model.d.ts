interface User {
  uid: string
  email: string
  name: string
}

interface Product {
  id: string
  title: string
  producer: string
  location: string
  quantity: number
  price: number // cents
  image: string
  unit?: string // default "u"
}

interface RegisteringProduct {
  uid: string // user ID
  title: string
  quantity?: number
  unit?: "kg" | "l" | "u"
  price: number // cents
  description: string
  photo: string
  email: string
  phone: string
  days: number
}

interface Producer {
  name: string
  address: string
  description: string
  email: string
  phone: string
  position: [number, number] // latitude, longitude
}

interface RegisteringProducer {
  siret: string
  name: string
  address: string
  firstname: string
  lastname: string
  description: string
  photo: string
  email: string
  phone: string
  password: string
}

interface Signin {
  email: string
  password: string
}

interface LostPassword {
  email: string
}

interface MapMarker {
  position: import("leaflet").LatLngExpression
  content: import("react").ReactNode
}
