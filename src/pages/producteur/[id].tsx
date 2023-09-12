import styled from "@emotion/styled"
import type { GetStaticPaths, GetStaticProps } from "next"
import type { ParsedUrlQuery } from "querystring"
import PinIcon from "src/assets/pin.svg"
import ProductCard from "src/cards/ProductCard"
import FollowButton from "src/components/FollowButton"
import Products from "src/components/Products"
import { COLORS, ISR_REVALIDATE, LAYOUT, SIZES, USER_ROLE } from "src/constants"
import { firestore, getObject } from "src/helpers-api/firebase"
import { formatPhone, getMapsLink } from "src/helpers/text"
import Layout from "src/layout"
import ErrorPage from "src/pages/_error"
import type { Producer, Product } from "src/types/model"

const Title = styled.h1`
  a {
    font-size: ${SIZES.card}px;
    font-weight: 300;
    color: ${COLORS.input};
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    br {
      display: none;
    }
    svg {
      margin: 0 8px 0 24px;
    }
  }
`
const Description = styled.p`
  white-space: pre-line;
`

interface Params extends ParsedUrlQuery {
  id: string
}

interface Props {
  producer: Producer | null
  products?: Product[]
}

const ProducerPage = ({ producer, products }: Props) => {
  if (!producer) {
    return <ErrorPage statusCode={404} title="Producteur introuvable" />
  }

  return (
    <Layout title={producer.name} description={producer.description}>
      <Title>
        {producer.name}
        <br />
        <a href={getMapsLink(producer)} target="_blank" rel="noopener">
          <PinIcon /> {producer.address}
        </a>
      </Title>
      <h2>Description</h2>
      <Description>{producer.description}</Description>
      <h2>E-mail</h2>
      <p>
        <a href={`mailto:${producer.email}`}>{producer.email}</a>
      </p>
      <h2>Téléphone</h2>
      <p>
        <a href={`tel:${producer.phone}`}>{formatPhone(producer.phone)}</a>
      </p>
      <FollowButton producer={producer.objectID} />
      {products && (
        <>
          <h2>{products.length} annonces en ligne</h2>
          <Products $col={3}>
            {products.map((product) => (
              <ProductCard key={product.objectID} product={product} />
            ))}
          </Products>
        </>
      )}
    </Layout>
  )
}

export const getStaticProps: GetStaticProps<Props, Params> = async ({ params }) => {
  const { id } = params as Params
  const producer = getObject<Producer>(await firestore.collection("users").doc(id).get())
  if (!producer) {
    return { notFound: true }
  }

  const props: Props = { producer }

  const { docs } = await firestore.collection("products").where("uid", "==", id).get()
  props.products = docs.map(getObject) as Product[] //.filter(({ expires }) => expires && expires > Date.now())

  return { props, revalidate: ISR_REVALIDATE }
}

export const getStaticPaths: GetStaticPaths<Params> = async () => {
  const producers = await firestore.collection("users").where("role", "==", USER_ROLE.PRODUCER).get()

  return {
    paths: producers.docs.map((doc) => ({ params: { id: doc.id } })),
    fallback: "blocking",
  }
}

export default ProducerPage
