import type { NextApiRequest, NextApiResponse } from "next"
import fetch from "node-fetch"
import { CONTACT_EMAIL, USER_ROLE } from "src/constants"
import { badRequest, respond } from "src/helpers-api"
import { productsIndex } from "src/helpers-api/algolia"
import { auth, FieldValue, firestore, getObject, getToken } from "src/helpers-api/firebase"
import { normalizeNumber } from "src/helpers/validators"
import type { Producer, RegisteringUser, UpdatingUser } from "src/types/model"

const checkCompany = async (siret: string, nocheck = false) => {
  const response = await fetch("https://api.insee.fr/entreprises/sirene/V3/siret/" + siret, {
    headers: {
      Authorization: `Bearer ${process.env.INSEE_TOKEN}`,
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

    //@ts-expect-error
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
    user.updated = new Date()
    if (user.role === USER_ROLE.PRODUCER) {
      user.phone = normalizeNumber(user.phone)
    }

    const usersCollection = firestore.collection("users")
    const userRef = usersCollection.doc(token.uid)

    const updates: Readonly<Promise<any>>[] = [userRef.update(user)]

    if (user.role === USER_ROLE.PRODUCER) {
      const userDoc = await userRef.get()
      const userData = getObject(userDoc) as Producer
      for (const uid in userData.followers) {
        updates.push(usersCollection.doc(uid).update({ [`followedProducers.${token.uid}.name`]: user.name }))
      }

      const products = await firestore.collection("products").where("uid", "==", token.uid).get()
      products.forEach((doc) => {
        updates.push(doc.ref.update({ producer: user.name }))
        updates.push(productsIndex.partialUpdateObject({ objectID: doc.id, producer: user.name }))
      })
    }

    await Promise.all(updates)

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
