import { getAnalytics, isSupported } from "firebase/analytics"
import { getApps, initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import {
  collection,
  doc,
  GeoPoint,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  Timestamp,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore"
import { useEffect, useState } from "react"
import { handleError } from "src/helpers/errors"
import type { Geoloc, Identified } from "src/types/model"

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_KEY,
      authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.firebaseapp.com`,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING,
      appId: process.env.NEXT_PUBLIC_FIREBASE_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASURE,
    })

if (typeof window !== "undefined") {
  // getAnalytics échoue si le SDK n'est pas supporté (webview, node…) : on ne log que si possible
  isSupported().then((yes) => {
    if (yes) {
      getAnalytics(app)
    }
  })
}

export const auth = getAuth(app)
export const firestore = getFirestore(app)
export { GeoPoint }

// Schema v4 ne lit que les clés propres : les Timestamp imbriqués (ex. slots[].date), dont `seconds`
// est un getter du prototype, sont normalisés en objets simples { seconds }
const normalizeNested = (value: unknown): unknown => {
  if (value instanceof Timestamp) {
    return { seconds: value.seconds }
  }
  if (Array.isArray(value)) {
    return value.map(normalizeNested)
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeNested(nested)]))
  }
  return value
}

export const getObject = (doc: DocumentSnapshot) => {
  const data = doc.data()
  const obj: DataObject = {
    objectID: doc.id,
  }
  if (!data) {
    // document sans données (supprimé ou jamais écrit) : il ne reste que l'id
    return obj
  }
  for (const key in data) {
    const value = data[key]
    if (value instanceof GeoPoint) {
      obj[key] = { lat: value.latitude, lng: value.longitude } as Geoloc
    } else if (value instanceof Timestamp) {
      obj[key] = value.toMillis()
    } else {
      obj[key] = normalizeNested(value)
    }
  }
  return obj
}

interface QueryProps<T> {
  data: T[]
  loading: boolean
}

export const useQuery = function <T extends Identified>(
  collectionName: string,
  whereClause?: WhereClause | false,
  live?: boolean,
): QueryProps<T> {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<T[]>([])

  useEffect(() => {
    if (whereClause === false) {
      // false => no query at this point
      setData([])
      setLoading(false)
      return
    }

    let ref: Query<DocumentData> = collection(firestore, collectionName)

    if (whereClause) {
      ref = query(ref, where(...whereClause))
    }

    const callback = (snapshot: QuerySnapshot) => {
      setData(snapshot.docs.map(getObject) as T[])
      setLoading(false)
    }

    if (live) {
      return onSnapshot(ref, callback, handleError)
    } else {
      getDocs(ref).then(callback).catch(handleError)
    }
  }, [collectionName, JSON.stringify(whereClause)]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading }
}

interface ObjectQueryProps<T> {
  data?: T
  loading: boolean
}

export const useObjectQuery = function <T extends Identified>(
  collectionName: string,
  id?: ID,
  live?: boolean,
): ObjectQueryProps<T> {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<T>()

  useEffect(() => {
    if (!id) {
      // no query at this point
      setData(undefined)
      setLoading(false)
      return
    }

    const ref = doc(collection(firestore, collectionName), id)

    const callback = (snapshot: DocumentSnapshot) => {
      setData(getObject(snapshot) as T)
      setLoading(false)
    }

    if (live) {
      return onSnapshot(ref, callback, handleError)
    } else {
      getDoc(ref).then(callback).catch(handleError)
    }
  }, [collectionName, id, live])

  return { data, loading }
}
