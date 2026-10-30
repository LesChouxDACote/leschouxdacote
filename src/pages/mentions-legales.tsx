import styled from "@emotion/styled"
import Link from "src/components/Link"
import { CONTACT_EMAIL } from "src/constants"
import Layout from "src/layout"

// Texte rédigé pour l'Éditeur, à relire par lui (ce n'est pas un avis juridique). Éditeur non professionnel : pas
// d'adresse postale publiée (LCEN, art. 6-III-2), à condition que l'hébergeur dispose de ses coordonnées.

const TextLink = styled.a`
  text-decoration: underline;
`
const PageLink = styled(Link)`
  text-decoration: underline;
`

const ContactLink = () => <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>

const LegalNoticePage = () => (
  <Layout title="Mentions légales">
    <h1>Mentions légales – leschouxdacote.fr</h1>
    <p>Dernière mise à jour : 29 octobre 2026.</p>

    <h2>1. Éditeur</h2>
    <p>
      Le site leschouxdacote.fr (le « Site ») est édité à titre personnel et non professionnel par Anthony NGUYEN,
      particulier (l’« Éditeur »), qui en est aussi le directeur de la publication.
    </p>
    <p>
      Contact : <ContactLink />
    </p>
    <p>
      Conformément à l’article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie
      numérique, l’Éditeur, non professionnel, a communiqué ses éléments d’identification personnels à l’hébergeur du
      Site.
    </p>

    <h2>2. Hébergeur</h2>
    <p>
      Vercel Inc.
      <br />
      440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
      <br />
      <TextLink href="https://vercel.com" target="_blank" rel="noopener">
        vercel.com
      </TextLink>
    </p>

    <h2>3. Propriété intellectuelle</h2>
    <p>
      Le Site, sa présentation et ses éléments propres (nom, logo, textes, mise en page) appartiennent à l’Éditeur.
      Toute reproduction ou réutilisation sans son autorisation est interdite.
    </p>
    <p>
      Les textes et photos des annonces appartiennent aux producteurs qui les publient, seuls responsables de leur
      contenu.
    </p>

    <h2>4. Données personnelles et conditions d’utilisation</h2>
    <p>
      Le traitement de vos données personnelles et l’usage des cookies sont décrits dans{" "}
      <PageLink href="/charte">notre charte de respect de la vie privée</PageLink>. Les règles d’utilisation du Site
      figurent dans les <PageLink href="/cgu">Conditions Générales d’Utilisation</PageLink>.
    </p>
  </Layout>
)

export default LegalNoticePage
