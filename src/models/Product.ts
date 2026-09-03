import { Schema as Sc } from "effect"
import { SlotSchemaFirestore } from "src/pages/compte/producteur/annonce"

const Identified = Sc.Struct({
  objectID: Sc.String,
  created: Sc.Number,
  updated: Sc.optional(Sc.Number),
})

const Geoloc = Sc.Struct({
  lat: Sc.Number,
  lng: Sc.Number,
})

export const ProductSchema = Sc.Struct({
  uid: Sc.String, // user ID (producer)
  title: Sc.String,
  quantity: Sc.optional(Sc.NullOr(Sc.Number)),
  unit: Sc.optional(Sc.NullOr(Sc.Literals(["g", "kg", "l", "u"]))),
  price: Sc.Number, // total, in cents
  address: Sc.String,
  _geoloc: Geoloc,
  bio: Sc.optional(Sc.NullOr(Sc.Boolean)),
  _tags: Sc.optional(Sc.NullOr(Sc.Array(Sc.String))),
  placeId: Sc.String, // from Google places
  city: Sc.String,
  dpt: Sc.optional(Sc.Union([Sc.Number, Sc.String])),
  description: Sc.String,
  photo: Sc.String,
  email: Sc.optional(Sc.NullOr(Sc.String)),
  phone: Sc.optional(Sc.NullOr(Sc.String)),
  published: Sc.optional(Sc.NullOr(Sc.Number)), // timestamp in ms
  expires: Sc.optional(Sc.NullOr(Sc.Number)), // timestamp in ms (null = disabled)
  views: Sc.optional(Sc.NullOr(Sc.Number)),
  // data fan-out:
  producer: Sc.String, // producer.name
  slots: Sc.optional(Sc.Array(SlotSchemaFirestore)),
  ...Identified.fields,
})

export type ProductEncoded = typeof ProductSchema.Encoded
