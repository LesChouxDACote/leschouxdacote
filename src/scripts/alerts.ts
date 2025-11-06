import { subHours } from "date-fns"
import { firestore, getObject } from "src/helpers-api/firebase"
import { MailjetTemplate, sendTemplateEmail } from "src/helpers-api/mail"
import { formatPrice, formatPricePerUnit, formatQuantity } from "src/helpers/text"
import { ProductEncoded } from "src/models/Product"
import type { User } from "src/types/model"

const handler = async () => {
  const startDate = subHours(new Date(), 1)

  const list = await firestore.collection("products").where("published", ">", startDate).get()

  const producers: Record<string, ProductEncoded[]> = {}

  list.forEach((doc) => {
    const product = getObject(doc) as ProductEncoded

    if (!producers[product.uid]) {
      producers[product.uid] = []
    }

    producers[product.uid].push(product)
  })

  const usersWithAlerts = await firestore.collection("users").where("followedProducers", "!=", null).get()

  const tasks: Promise<any>[] = []

  usersWithAlerts.forEach((doc) => {
    const user = getObject(doc) as User

    for (const producerId in user.followedProducers) {
      const producerAlert = user.followedProducers[producerId]
      const producer = producerAlert.name
      const products = producers[producerId]
      if (producerAlert.emailAlert && products) {
        const title = `${producer} vient de publier ${products.length} annonce${products.length > 1 ? "s" : ""}`
        const variables = {
          title,
          name: user.firstname,
          producer,
          products: products.map((product) => ({
            url: `${process.env.NEXT_PUBLIC_URL}/annonce/${product.objectID}`,
            photo: product.photo,
            title: product.title,
            quantity: formatQuantity(product),
            pricePerUnit: formatPricePerUnit(product),
            price: formatPrice(product),
          })),
        }
        tasks.push(sendTemplateEmail(user.email, MailjetTemplate.alert, variables, title))
      }
    }
  })

  const results = await Promise.all(tasks)

  console.log(results)
}

handler()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
