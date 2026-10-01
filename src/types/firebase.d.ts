/************************************** SHORTHAND TYPES **************************************/

type FirebaseUser = import("firebase/auth").User
type UserCredential = import("firebase/auth").UserCredential

type FieldPath = import("firebase/firestore").FieldPath
type WhereFilterOp = import("firebase/firestore").WhereFilterOp
type DocumentData = import("firebase/firestore").DocumentData
type DocumentSnapshot<D = DocumentData> = import("firebase/firestore").DocumentSnapshot<D>
type CollectionReference<D = DocumentData> = import("firebase/firestore").CollectionReference<D>
type Query<D = DocumentData> = import("firebase/firestore").Query<D>
type QuerySnapshot<D = DocumentData> = import("firebase/firestore").QuerySnapshot<D>
type Timestamp = import("firebase/firestore").Timestamp
type GeoPoint = import("firebase/firestore").GeoPoint

/*********************************************************************************************/

type ID = string // generated from Firestore

type WhereClause = [string | FieldPath, WhereFilterOp, any]

type CollectionOrQuery = CollectionReference<DocumentData> | Query<DocumentData>

// for getObject() helpers
interface DataObject {
  objectID: ID
  [key: string]: any
}
