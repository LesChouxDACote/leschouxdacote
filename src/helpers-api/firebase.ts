import * as admin from "firebase-admin"
import type { NextApiRequest } from "next"
import type { Geoloc } from "src/types/model"

const app = admin.apps.length
  ? admin.app()
  : admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT,
        clientEmail: process.env.FIREBASE_EMAIL,
        privateKey: `-----BEGIN PRIVATE KEY-----\n${process.env.FIREBASE_PRIVATE_KEY}\n-----END PRIVATE KEY-----\n`,
      }),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.appspot.com`,
    })

export const auth = app.auth()
export const firestore = app.firestore()
export const storage = app.storage()
export const GeoPoint = admin.firestore.GeoPoint
export const FieldValue = admin.firestore.FieldValue
export const Timestamp = admin.firestore.Timestamp

// getObject ne convertit en millisecondes que les Timestamps de premier niveau du document :
// pour les valeurs imbriquées (ex. dates des créneaux dans le tableau slots), passer par ce
// helper. Une valeur inattendue (ni Timestamp ni nombre) renvoie null.
export const toMillis = (value: unknown): number | null => {
  if (value instanceof Timestamp) {
    return value.toMillis()
  }
  return typeof value === "number" ? value : null
}

export const getObject = <T extends DataObject = DataObject>(doc: admin.firestore.DocumentSnapshot) => {
  if (!doc.exists) {
    return null
  }
  const data = doc.data()
  const obj: DataObject = {
    objectID: doc.id,
  }
  for (const key in data) {
    const value = data[key]
    if (value instanceof admin.firestore.GeoPoint) {
      obj[key] = { lat: value.latitude, lng: value.longitude } as Geoloc
    } else if (value instanceof admin.firestore.Timestamp) {
      obj[key] = value.toMillis()
    } else {
      obj[key] = value
    }
  }
  return obj as T
}

export const getToken = (req: NextApiRequest) => {
  const token = req.headers["x-token"]
  if (typeof token !== "string") {
    return null
  }
  return auth.verifyIdToken(token)
}
