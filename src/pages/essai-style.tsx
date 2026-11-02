import styled from "@emotion/styled"
import type { GetServerSideProps } from "next"
import Head from "next/head"
import { FormProvider, useForm } from "react-hook-form"
import { ProductInfos } from "src/cards/ProductCard"
import { Button } from "src/components/Button"
import { TextInput } from "src/components/Form"
import { COLORS, FONT, LAYOUT, SIZES } from "src/constants"
import Layout from "src/layout"
import { ProductEncoded } from "src/models/Product"

// Page d'essai temporaire (choix de la police et des arrondis du rafraîchissement de l'interface) :
// elle n'existe que sous `next dev` (l'Aperçu), jamais dans un build publié. À supprimer une fois le choix fait.

const FONTS = [
  { label: "Roboto (actuelle)", family: FONT },
  { label: "Nunito", family: "'Nunito', sans-serif" },
  { label: "Inter", family: "'Inter', sans-serif" },
]

const RADII = [
  { label: "Léger (4 px)", radius: 4 },
  { label: "Moyen (8 px)", radius: 8 },
  { label: "Marqué (16 px)", radius: 16 },
]

// Annonce inventée : rien n'est lu ni écrit dans les données
const SAMPLE_PRODUCT: ProductEncoded = {
  objectID: "essai-style",
  uid: "essai-style",
  title: "Panier de légumes de saison",
  quantity: 3,
  unit: "kg",
  price: 1250,
  address: "Toulouse",
  _geoloc: { lat: 43.6047, lng: 1.4442 },
  bio: true,
  placeId: "",
  city: "Toulouse",
  dpt: 31,
  description: "",
  photo: "/actualite/vente-a-la-ferme.jpg",
  producer: "La Ferme d'Exemple",
  created: 0,
}

const Intro = styled.p`
  color: ${COLORS.menu};
`
const Section = styled.section`
  margin: 40px 0;
`
const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const Column = styled.div`
  padding: 16px;
  border: 1px solid ${COLORS.border};
  background-color: ${COLORS.white};
`
const ColumnLabel = styled.p`
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${COLORS.border};
  color: ${COLORS.grey};
  font-size: ${SIZES.small}px;
  text-transform: uppercase;
  letter-spacing: 1px;
`
const FontColumn = styled(Column)<{ $family: string }>`
  &,
  & * {
    font-family: ${({ $family }) => $family};
  }
`
// le bouton a son arrondi écrit en dur, le champ hérite de celui du libellé : on les surcharge ici
const RadiusColumn = styled(Column)<{ $radius: number }>`
  & .sample-button,
  & label input,
  & .sample-card {
    border-radius: ${({ $radius }) => $radius}px;
  }
`
const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
`
const SampleCard = styled.div`
  overflow: hidden;
  box-shadow: 0px 3px 3px ${COLORS.shadow.light};
`

const Samples = () => (
  <>
    <h1>Titre de page</h1>
    <h2>Sous-titre de section</h2>
    <p>
      Des légumes cueillis le matin même, en vente directe à la ferme. Réservez votre panier et passez le récupérer sur
      le créneau de votre choix.
    </p>
    <Buttons>
      <Button className="sample-button" $variant="green" type="button">
        Réserver
      </Button>
      <Button className="sample-button" $variant="white" type="button">
        Annuler
      </Button>
    </Buttons>
    <TextInput name="email" label="Adresse e-mail" placeholder="vous@exemple.fr" />
    <SampleCard className="sample-card">
      <ProductInfos product={SAMPLE_PRODUCT} />
    </SampleCard>
  </>
)

const StyleTrialPage = () => {
  const form = useForm()

  return (
    <Layout title="Essai de style" noindex>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=Nunito:wght@300;400;500;700&display=swap"
        />
      </Head>
      <FormProvider {...form}>
        <h1>Essai de style</h1>
        <Intro>Page visible seulement dans l&apos;Aperçu : choisissez une police puis un arrondi.</Intro>
        <Section>
          <h2>Polices</h2>
          <Columns>
            {FONTS.map(({ label, family }) => (
              <FontColumn key={label} $family={family}>
                <ColumnLabel>{label}</ColumnLabel>
                <Samples />
              </FontColumn>
            ))}
          </Columns>
        </Section>
        <Section>
          <h2>Arrondis</h2>
          <Columns>
            {RADII.map(({ label, radius }) => (
              <RadiusColumn key={label} $radius={radius}>
                <ColumnLabel>{label}</ColumnLabel>
                <Samples />
              </RadiusColumn>
            ))}
          </Columns>
        </Section>
      </FormProvider>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV !== "development") {
    return { notFound: true }
  }
  return { props: {} }
}

export default StyleTrialPage
