import { startOfHour, subDays } from "date-fns"
import { USER_ROLE } from "src/constants"
import { firestore, getObject } from "src/helpers-api/firebase"
import { MailjetTemplate, sendTemplateEmail } from "src/helpers-api/mail"
import { formatPrice } from "src/helpers/text"
import { ProductEncoded } from "src/models/Product"
import type { Producer } from "src/types/model"

const handler = async () => {
  const producersList = await firestore.collection("users").where("role", "==", USER_ROLE.PRODUCER).get()

  const map: Record<string, { producer: Producer; products: ProductEncoded[] }> = {}

  producersList.forEach((doc) => {
    const producer = getObject(doc) as Producer
    map[doc.id] = {
      producer,
      products: [],
    }
  })

  const end = startOfHour(new Date())
  const start = subDays(end, 1)

  const productsList = await firestore
    .collection("products")
    .where("expires", "<=", end)
    .where("expires", ">", start)
    .get()

  productsList.forEach((doc) => {
    const product = getObject(doc) as ProductEncoded
    map[product.uid].products.push(product)
  })

  const tasks: Promise<any>[] = []
  for (const producerId in map) {
    const { producer, products } = map[producerId]
    if (products.length && producer.alertsExpired !== false) {
      const title = `Certaines de vos annonces ne sont plus en ligne`
      const variables = {
        products: products.map((product) => ({
          url: `${process.env.NEXT_PUBLIC_URL}/annonce/${product.objectID}`,
          photo: product.photo,
          title: product.title,
          price: formatPrice(product),
        })),
      }
      tasks.push(sendTemplateEmail(producer.email, MailjetTemplate.expired, variables, title))
    }
  }

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
