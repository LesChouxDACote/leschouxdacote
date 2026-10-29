import styled from "@emotion/styled"
import { LinkButton } from "src/components/Button"
import { COLORS, CONTACT_EMAIL, LAYOUT, SIZES } from "src/constants"
import Layout from "src/layout"

// Texte repris de l'ancienne page « À propos » (info.leschouxdacote.fr/a-propos), équipe complétée de Charles ILIEFF.
// Photos de l'équipe et illustrations dans public/a-propos/ ; sans photo, les initiales s'affichent à la place.

// Fond vert pâle sur toute la largeur, texte plus gros, plus gras et plus aéré que le reste du site (Roboto 300)
const Page = styled.div`
  background-color: ${COLORS.background.success};
  font-size: 17px;
  font-weight: 400;
  line-height: 1.7;
  h1,
  h2 {
    color: ${COLORS.dark};
  }
`
const Column = styled.div`
  max-width: ${LAYOUT.maxWidth}px;
  margin: 0 auto;
  padding: 32px;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 24px;
  }
`
const Findings = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin: 24px 0;
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const Finding = styled.section`
  border: 1px solid ${COLORS.border};
  border-radius: 8px;
  padding: 16px;
  background-color: ${COLORS.white};
  h3 {
    margin-top: 0;
    color: ${COLORS.green};
  }
  img {
    display: block;
    width: 180px;
    max-width: 100%;
    margin: 0 auto 16px;
  }
`
const Center = styled.p`
  text-align: center;
  margin: 24px 0;
`
const Team = styled.ul`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  list-style: none;
  padding: 0;
  margin: 24px 0;
  text-align: center;
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: repeat(2, 1fr);
  }
`
// $shaped : photo déjà détourée (forme et feuilles de l'ancienne page), affichée entière sans cercle ni fond
const Avatar = styled.div<{ $shaped?: boolean }>`
  width: 140px;
  height: 140px;
  max-width: 100%;
  margin: 0 auto 12px;
  border-radius: ${({ $shaped }) => ($shaped ? 0 : "50%")};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $shaped }) => ($shaped ? "transparent" : COLORS.background.success)};
  color: ${COLORS.green};
  font-size: ${SIZES.price}px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`
const TextLink = styled.a`
  text-decoration: underline;
`
const Name = styled.a`
  font-weight: bold;
  text-decoration: underline;
`
const Role = styled.p`
  margin: 4px 0 0;
  color: ${COLORS.grey};
`
const Actions = styled.p`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
`

interface Member {
  name: string
  role: string
  url: string
  photo?: string
  shaped?: boolean
}

const TEAM: Member[] = [
  {
    name: "Anthony NGUYEN",
    role: "Fondateur",
    url: "https://www.linkedin.com/in/anthonynguyen83/",
    photo: "/a-propos/anthony.webp",
    shaped: true,
  },
  {
    name: "Antoine ROUSSEAU",
    role: "Développeur",
    url: "https://antoine.rousseau.im/",
    photo: "/a-propos/antoine.webp",
    shaped: true,
  },
  {
    name: "Charles ILIEFF",
    role: "Développeur",
    url: "https://www.linkedin.com/in/charles-ilieff-3b286a39/",
    photo: "/a-propos/charles.jpg",
  },
  {
    name: "Margot DAUBAN",
    role: "Communication",
    url: "https://www.margotdauban.fr/",
    photo: "/a-propos/margot.webp",
    shaped: true,
  },
]

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")

const AboutContent = () => (
  <>
    <h1>À propos</h1>

    <h2>D&apos;où vient l&apos;idée Les Choux d&apos;à Côté ?</h2>
    <p>
      En septembre 2020, Anthony a vu un documentaire montrant que des pêcheurs de Porto Rico indiquaient dans une
      application mobile leur pêche du jour. Les restaurateurs utilisant ce service pouvaient contacter directement les
      pêcheurs afin d&apos;acheter leurs produits.
    </p>
    <p>
      L&apos;idée était née ! Un site d&apos;annonces alimentaires, voilà le chaînon qu&apos;il manquait pour rapprocher
      les producteurs et acheteurs d&apos;un même territoire.
    </p>
    <p>Au fil de ses recherches et entretiens autour du circuit court, Anthony a constaté plusieurs points :</p>

    <Findings>
      <Finding>
        <img src="/a-propos/producteurs.webp" alt="" />
        <h3>Les producteurs</h3>
        <p>
          La vente à la ferme et le marché sont les principaux modes de commercialisation en circuit court : de la vente
          directe, sans intermédiaire. Pourtant, pour gagner en visibilité, beaucoup de producteurs se tournent vers des
          marketplaces qui imposent leurs règles.
        </p>
        <p>
          <em>
            Ce qu&apos;il manque, c&apos;est un service de diffusion d&apos;annonces alimentaires, pour mettre en avant
            ses produits, élargir son réseau en toute autonomie et vendre en direct.
          </em>
        </p>
      </Finding>
      <Finding>
        <img src="/a-propos/acheteurs-professionnels.webp" alt="" />
        <h3>Les acheteurs professionnels</h3>
        <p>
          Les acheteurs professionnels cherchent à acheter en grande quantité des produits de qualité. Ils veulent
          pouvoir comparer les offres, négocier et rencontrer les producteurs, ce que la vente en ligne ne permet pas.
        </p>
        <p>
          <em>
            Ce qu&apos;il manque, c&apos;est un site de mise en relation directe et flexible, qui n&apos;impose pas de
            moyen de paiement ni de livraison.
          </em>
        </p>
      </Finding>
      <Finding>
        <img src="/a-propos/particuliers.webp" alt="" />
        <h3>Les particuliers</h3>
        <p>
          Les particuliers sont de plus en plus nombreux à se tourner vers une consommation locale et responsable. Mais
          comment rencontrer les producteurs et découvrir leurs produits ?
        </p>
        <p>
          <em>
            Ce qu&apos;il manque, c&apos;est une plateforme qui référence et géolocalise des produits, pour faciliter la
            recherche et acheter directement auprès du producteur.
          </em>
        </p>
      </Finding>
    </Findings>

    <p>La plateforme de vente directe Les Choux d&apos;à Côté répond justement à toutes ces problématiques !</p>

    <h2>L&apos;équipe derrière le projet</h2>
    <Team>
      {TEAM.map((member) => (
        <li key={member.name}>
          <Avatar $shaped={member.shaped}>
            {member.photo ? <img src={member.photo} alt={member.name} /> : getInitials(member.name)}
          </Avatar>
          <Name href={member.url} target="_blank" rel="noopener">
            {member.name}
          </Name>
          <Role>{member.role}</Role>
        </li>
      ))}
    </Team>

    <h2>Les Choux d&apos;à Côté évolue avec Kedalia</h2>
    <p>
      Le site continue d&apos;évoluer avec{" "}
      <TextLink href="https://kedalia.com" target="_blank" rel="noopener">
        Kedalia
      </TextLink>
      , un service qui construit et fait évoluer des applications web pour celles et ceux qui ne sont pas développeurs :
      les nouveautés sont décrites en mots simples, puis réalisées et mises en ligne. Charles ILIEFF est le porteur de
      ce projet.
    </p>

    <Center>Les Choux d&apos;à Côté, la plateforme pour l&apos;achat et la vente de produits locaux</Center>
    <Actions>
      <LinkButton href="/inscription" $variant="green">
        Inscription gratuite
      </LinkButton>
      <LinkButton href={`mailto:${CONTACT_EMAIL}`}>Nous contacter</LinkButton>
    </Actions>
  </>
)

const AboutPage = () => (
  <Layout title="À propos" fullWidth>
    <Page>
      <Column>
        <AboutContent />
      </Column>
    </Page>
  </Layout>
)

export default AboutPage
