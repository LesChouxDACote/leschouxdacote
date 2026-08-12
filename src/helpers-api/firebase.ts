import { cert, getApps, initializeApp } from "firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, GeoPoint, Timestamp, getFirestore, type DocumentSnapshot } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import type { NextApiRequest } from "next"
import type { Geoloc } from "src/types/model"

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT,
        clientEmail: process.env.FIREBASE_EMAIL,
        privateKey: `-----BEGIN PRIVATE KEY-----\n${process.env.FIREBASE_PRIVATE_KEY}\n-----END PRIVATE KEY-----\n`,
      }),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.appspot.com`,
    })

export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const storage = getStorage(app)
export { FieldValue, GeoPoint }

export const getObject = <T extends DataObject = DataObject>(doc: DocumentSnapshot) => {
  if (!doc.exists) {
    return null
  }
  const data = doc.data()
  const obj: DataObject = {
    objectID: doc.id,
  }
  for (const key in data) {
    const value = data[key]
    if (value instanceof GeoPoint) {
      obj[key] = { lat: value.latitude, lng: value.longitude } as Geoloc
    } else if (value instanceof Timestamp) {
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
