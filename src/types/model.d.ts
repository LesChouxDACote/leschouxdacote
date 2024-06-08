import { USER_ROLE } from "src/constants"

interface AuthUser {
  uid: string
  email: string
  name: string
}

interface Identified {
  objectID: string
  created: number // timestamp in ms
  updated?: number // timestamp in ms
}

type Registering<T> = Omit<T, "objectID" | "updated">
type Updating<T> = Omit<T, "objectID" | "created">

type Unit = "g" | "kg" | "l" | "u"

interface Geoloc {
  lat: number
  lng: number
}

interface FollowedProducer {
  emailAlert: boolean
  // data fan-out:
  name?: string
  address?: string
}
interface Follower {
  emailAlert: boolean
}

interface BaseUser extends Identified {
  firstname: string
  lastname: string
  // _geoloc: Geoloc
  email: string
  followedProducers: Record<string, FollowedProducer>
  role: USER_ROLE
}
interface Buyer extends BaseUser {
  role: USER_ROLE.BUYER
}

interface Admin extends BaseUser {
  role: USER_ROLE.ADMIN
}
interface Producer extends BaseUser {
  role: USER_ROLE.PRODUCER
  siret: string
  name: string // company name
  address: string
  description: string
  phone: string
  followers?: Record<string, Follower>
  alertsExpired?: boolean
}
type User = Buyer | Producer | Admin

interface RegisteringUser extends Registering<Producer> {
  created: Date
  password?: string
  nocheck?: boolean
}

interface UpdatingUser extends Omit<Updating<Producer>, "siret"> {
  updated: Date
}

interface Product extends Identified {
  uid: string // user ID (producer)
  title: string
  quantity: number | null
  unit: Unit | null
  price: number // total, in cents
  address: string
  _geoloc: Geoloc
  bio: boolean | null
  _tags: string[] | null
  placeId: string // from Google places
  city: string
  dpt: string
  description: string
  photo: string
  email: string | null
  phone: string | null
  published: number | null // timestamp in ms
  expires: number | null // timestamp in ms (null = disabled)
  views: number | null
  // data fan-out:
  producer: string // producer.name
}

interface RegisteringProduct extends Registering<Product> {
  created: Date
  updated?: Date
  published?: Date
  expires: Date
  _geoloc: GeoPoint
}

interface ProductPayload extends Omit<RegisteringProduct, "created" | "updated" | "expires" | "published" | "_geoloc"> {
  id?: string
  days: string
  lat: string
  lng: string
  _tags: any
}
