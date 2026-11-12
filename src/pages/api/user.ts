import type { NextApiRequest, NextApiResponse } from "next"
import { CONTACT_EMAIL, USER_ROLE } from "src/constants"
import { badRequest, respond } from "src/helpers-api"
import { productsIndex } from "src/helpers-api/algolia"
import { auth, FieldValue, firestore, getObject, getToken } from "src/helpers-api/firebase"
import { normalizeNumber } from "src/helpers/validators"
import type { Producer, RegisteringUser, UpdatingUser } from "src/types/model"

const checkCompany = async (siret: string, nocheck = false) => {
  const response = await fetch("https://api.insee.fr/api-sirene/3.11/siret/" + siret, {
    headers: {
      "X-INSEE-Api-Key-Integration": `${process.env.INSEE_TOKEN}`,
    },
  })

  if (response.status === 404) {
    return "Numéro de SIRET introuvable"
  }
  if (response.status === 403) {
    return "Ce numéro de SIRET n'existe pas ou plus, ou ses données ne sont pas consultables"
  }

  if (response.status >= 400) {
    console.warn("INSEE API HTTP Error", response.status, response.statusText)
    // TODO: report
    return `Une erreur est survenue lors de l'obtention des informations sur votre société. Veuillez réessayer plus tard.
    Si le problème persiste, contactez-nous à cette adresse : ${CONTACT_EMAIL}`
  }

  const snapshot = await firestore.collection("users").where("siret", "==", siret).get()
  if (snapshot.size > 0) {
    return `Le compte de cet établissement est déjà créé`
  }

  if (!nocheck) {
    const data: any = await response.json()
    const activityCode = data.etablissement.uniteLegale.activitePrincipaleUniteLegale.replace(".", "")

    const { exists } = await firestore.collection("activityCodes").doc(activityCode).get()

    if (!exists) {
      return `Désolé, l'activité principale de votre société ne vous permet pas de publier des annonces sur notre plateforme.
    Si vous avez des questions, contactez-nous à cette adresse : ${CONTACT_EMAIL}`
    }
  }
}

const removeEmpty = (obj: Record<string, any>) => {
  for (const key in obj) {
    if (obj[key] === "" || obj[key] == null) {
      delete obj[key]
    }
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse<ApiResponse<RegisteringUser>>) => {
  if (req.method === "POST") {
    // user registration
    const user = req.body as RegisteringUser // TODO: validate fields
    delete (user as any).isAdmin
    if (user.role === USER_ROLE.PRODUCER) {
      user.siret = user.siret.replace(/\s+/g, "") // remove spaces
      const checkError = await checkCompany(user.siret, user.nocheck)
      if (checkError) {
        return respond(res, {
          siret: checkError,
        })
      }
      user.phone = normalizeNumber(user.phone)
      user.alertsExpired = true
    }
    if (!user.nocheck) {
      delete user.nocheck
    }

    user.created = new Date()
    let uid: string

    try {
      const createdUser = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
        // phoneNumber: producer.phone.replace(/\s+/g, "").replace(/^0/, "+33"),
      })
      uid = createdUser.uid
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        return respond(res, {
          email: "Adresse e-mail invalide",
        })
      }
      if (error.code === "auth/email-already-exists") {
        return respond(res, {
          email: "Cette adresse e-mail est déjà utilisée",
        })
      }
      if (error.code === "auth/phone-number-already-exists") {
        return respond(res, {
          phone: "Ce numéro de téléphone est déjà utilisé",
        })
      }
      // TODO: report
      throw error
    }

    //@ts-expect-error yes
    delete user.password

    if (user.role !== USER_ROLE.PRODUCER) {
      removeEmpty(user)
    }

    await firestore.collection("users").doc(uid).set(user)

    return respond(res)
  }

  if (req.method === "PUT") {
    const token = await getToken(req)
    if (!token) {
      return badRequest(res, 403)
    }

    const user = req.body as UpdatingUser // TODO: validate fields
    // isAdmin and role must never be set via this public route (privilege escalation)
    delete (user as any).isAdmin
    delete (user as any).role
    user.updated = new Date()

    const usersCollection = firestore.collection("users")
    const userRef = usersCollection.doc(token.uid)

    const userDoc = await userRef.get()
    const userData = getObject(userDoc) as Producer
    const isProducer = userData.role === USER_ROLE.PRODUCER

    if (isProducer) {
      user.phone = normalizeNumber(user.phone)
    }

    // le profil d'abord : seul un échec de son enregistrement est une erreur pour le producteur
    await userRef.update(user)

    if (isProducer && user.name) {
      // data fan-out du nom : un abonné ou une annonce qui ne se met pas à jour (ex. compte supprimé)
      // est journalisé, sans faire échouer l'enregistrement du profil
      const targets: string[] = []
      const updates: Readonly<Promise<any>>[] = []
      for (const uid in userData.followers) {
        targets.push(`abonné ${uid}`)
        updates.push(usersCollection.doc(uid).update({ [`followedProducers.${token.uid}.name`]: user.name }))
      }

      try {
        const products = await firestore.collection("products").where("uid", "==", token.uid).get()
        products.forEach((doc) => {
          targets.push(`annonce ${doc.id}`, `index de l'annonce ${doc.id}`)
          updates.push(doc.ref.update({ producer: user.name }))
          updates.push(productsIndex.partialUpdateObject({ objectID: doc.id, producer: user.name }))
        })
      } catch (error) {
        console.error("user: échec de la mise à jour du nom", "annonces du producteur", error)
      }

      const results = await Promise.allSettled(updates)
      results.forEach((result, i) => {
        if (result.status === "rejected") {
          console.error("user: échec de la mise à jour du nom", targets[i], result.reason)
        }
      })
    }

    return respond(res)
  }

  if (req.method === "DELETE") {
    const token = await getToken(req)
    if (!token) {
      return badRequest(res, 403)
    }

    const usersCollection = firestore.collection("users")
    const userRef = usersCollection.doc(token.uid)

    const updates: Readonly<Promise<any>>[] = [auth.deleteUser(token.uid)]

    const userDoc = await userRef.get()
    const userData = getObject(userDoc) as Producer
    if (userData.role === USER_ROLE.PRODUCER) {
      const products = await firestore.collection("products").where("uid", "==", token.uid).get()
      products.forEach((doc) => {
        updates.push(doc.ref.delete())
        updates.push(productsIndex.deleteObject(doc.id))
      })

      for (const uid in userData.followers) {
        updates.push(usersCollection.doc(uid).update({ [`followedProducers.${token.uid}`]: FieldValue.delete() }))
      }
    }

    updates.push(userRef.delete())

    await Promise.all(updates)

    return respond(res)
  }

  badRequest(res)
}

export default handler
