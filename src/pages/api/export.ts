import { formatISO9075 } from "date-fns"
import type { NextApiRequest, NextApiResponse } from "next"
import { USER_ROLE } from "src/constants"

import getCsv from "src/helpers-api/csv"
import { firestore, getObject, getToken } from "src/helpers-api/firebase"
import type { Producer, Product } from "src/types/model"

const handler = async (req: NextApiRequest, res: NextApiResponse<string>) => {
  const query = req.query.q
  const token = await getToken(req)

  if (!token || token.email !== "cilieff@gmail.com") {
    return res.status(403).json("Not Authorized")
  }
  if (req.method === "GET" && (query === "producers" || query === "buyers")) {
    const role = query === "producers" ? USER_ROLE.PRODUCER : USER_ROLE.BUYER

    const productsSnapshot = await firestore.collection("products").get()
    const sums: Record<string, number> = {}
    productsSnapshot.forEach((doc) => {
      const product = getObject(doc) as Product
      if (!sums[product.uid]) {
        sums[product.uid] = 1
      } else {
        sums[product.uid]++
      }
    })

    const producersSnapshot = await firestore.collection("users").where("role", "==", role).get()
    const producers = producersSnapshot.docs.map((doc) => {
      const producer = getObject(doc) as Producer
      return [
        producer.siret,
        producer.name,
        producer.firstname,
        producer.lastname,
        producer.email,
        producer.phone,
        producer.address,
        producer.created && formatISO9075(producer.created),
        sums[producer.objectID] || 0,
      ]
    })

    try {
      const output = await getCsv(producers, [
        "SIRET",
        "Producteur",
        "Prénom",
        "Nom",
        "E-mail",
        "Téléphone",
        "Adresse",
        "Date d'inscription",
        "Nombre d'annonces",
      ])

      res.setHeader("Content-Type", "text/csv")

      res.status(200).send(output)
    } catch (err) {
      console.error(err)
      res.status(500).end()
    }

    return
  }

  res.status(400).send("Bad request")
}

export default handler
