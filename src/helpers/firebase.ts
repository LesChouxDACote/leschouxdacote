import "firebase/analytics"
import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"
import { useEffect, useState } from "react"
import { handleError } from "src/helpers/errors"
import type { Geoloc, Identified } from "src/types/model"

const app = firebase.apps.length
  ? firebase.app()
  : firebase.initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_KEY,
      authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.firebaseapp.com`,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING,
      appId: process.env.NEXT_PUBLIC_FIREBASE_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASURE,
    })

if (typeof window !== "undefined") {
  app.analytics()
}

export const auth = app.auth()
export const firestore = app.firestore()
export const GeoPoint = firebase.firestore.GeoPoint

export const getObject = (doc: firebase.firestore.DocumentData) => {
  const data = doc.data()
  const obj: DataObject = {
    objectID: doc.id,
  }
  for (const key in data) {
    const value = data[key]
    if (value instanceof firebase.firestore.GeoPoint) {
      obj[key] = { lat: value.latitude, lng: value.longitude } as Geoloc
    } else if (value instanceof firebase.firestore.Timestamp) {
      obj[key] = value.toMillis()
    } else {
      obj[key] = value
    }
  }
  return obj
}

interface QueryProps<T> {
  data: T[]
  loading: boolean
}

export const useQuery = function <T extends Identified>(
  collection: string,
  where?: WhereClause | false,
  live?: boolean,
): QueryProps<T> {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<T[]>([])

  useEffect(() => {
    if (where === false) {
      // false => no query at this point
      setData([])
      setLoading(false)
      return
    }

    let ref: CollectionOrQuery = firestore.collection(collection)

    if (where) {
      ref = ref.where(...where)
    }

    const callback = (snapshot: QuerySnapshot) => {
      setData(snapshot.docs.map(getObject) as T[])
      setLoading(false)
    }

    if (live) {
      return ref.onSnapshot(callback, handleError)
    } else {
      ref.get().then(callback).catch(handleError)
    }
  }, [collection, JSON.stringify(where)]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading }
}

interface ObjectQueryProps<T> {
  data?: T
  loading: boolean
}

export const useObjectQuery = function <T extends Identified>(
  collection: string,
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

    const ref = firestore.collection(collection).doc(id)

    const callback = (doc: DocumentSnapshot) => {
      setData(getObject(doc) as T)
      setLoading(false)
    }

    if (live) {
      return ref.onSnapshot(callback, handleError)
    } else {
      ref.get().then(callback).catch(handleError)
    }
  }, [collection, id, live])

  return { data, loading }
}
