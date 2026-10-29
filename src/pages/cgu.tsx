import styled from "@emotion/styled"
import Link from "src/components/Link"
import { CONTACT_EMAIL } from "src/constants"
import Layout from "src/layout"

// Texte rédigé pour l'Éditeur à partir du fonctionnement du Site, à relire par lui (ce n'est pas un avis juridique).
// Il complète la charte (src/pages/charte.tsx), dont il reprend les termes « Site » et « Éditeur ».

const TextLink = styled.a`
  text-decoration: underline;
`
const PageLink = styled(Link)`
  text-decoration: underline;
`

const ContactLink = () => <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>

const TermsPage = () => (
  <Layout title="Conditions générales d’utilisation">
    <h1>Conditions générales d’utilisation – leschouxdacote.fr</h1>
    <p>Dernière mise à jour : 29 octobre 2026.</p>

    <h2>1. Objet</h2>
    <p>
      Le site leschouxdacote.fr (le « Site ») permet à des producteurs de produits alimentaires de publier des annonces
      et à des acheteurs de les trouver, de les réserver et de contacter directement les producteurs, sans
      intermédiaire.
    </p>
    <p>
      Le Site est édité à titre personnel et non professionnel par Anthony NGUYEN (l’« Éditeur »). Son utilisation est
      gratuite.
    </p>
    <p>
      Les présentes Conditions Générales d’Utilisation (les « CGU ») fixent les règles d’utilisation du Site. Contact :{" "}
      <ContactLink />
    </p>

    <h2>2. Acceptation des CGU</h2>
    <p>
      La consultation des annonces est libre. La création d’un compte vaut acceptation des CGU dans leur version en
      vigueur. Si vous ne les acceptez pas, ne créez pas de compte.
    </p>

    <h2>3. Comptes</h2>
    <p>Deux types de comptes existent :</p>
    <ul>
      <li>
        Compte producteur : réservé aux professionnels qui vendent les produits qu’ils produisent ou transforment. Il
        demande un numéro SIRET, un nom commercial, une adresse, une description de l’activité et un numéro de
        téléphone.
      </li>
      <li>
        Compte acheteur : il permet de suivre des producteurs, de recevoir des alertes et de réserver des produits.
      </li>
    </ul>
    <p>
      Le Site est réservé aux personnes majeures. Vous vous engagez à fournir des informations exactes et à les tenir à
      jour. Votre mot de passe est personnel : gardez-le confidentiel. Toute action réalisée depuis votre compte est
      réputée faite par vous.
    </p>

    <h2>4. Annonces</h2>
    <p>Le producteur est seul responsable des annonces qu’il publie. Il s’engage à :</p>
    <ul>
      <li>ne proposer que des produits alimentaires qu’il produit ou transforme lui-même ;</li>
      <li>
        respecter la réglementation applicable à ses produits, notamment les règles d’hygiène, de traçabilité,
        d’étiquetage et d’information sur les prix ;
      </li>
      <li>décrire ses produits de façon exacte et loyale (nature, quantité, prix, lieu et créneaux de retrait) ;</li>
      <li>ne publier que des textes et des photos dont il détient les droits.</li>
    </ul>
    <p>
      Une annonce a une durée de validité limitée : à sa date d’expiration, elle n’est plus visible. Le producteur peut
      être prévenu par e-mail et la remettre en ligne depuis son compte.
    </p>
    <p>
      L’Éditeur peut retirer, sans préavis, une annonce illicite, trompeuse ou contraire aux CGU ou à l’objet du Site.
    </p>

    <h2>5. Réservations</h2>
    <p>
      Lorsqu’un producteur l’a prévu, l’acheteur peut réserver une quantité d’un produit sur un créneau de retrait, dans
      la limite des quantités disponibles. Ses prénom, nom, adresse e-mail et numéro de téléphone sont alors transmis au
      producteur, qui est prévenu par e-mail.
    </p>
    <p>
      L’acheteur peut modifier ou annuler sa réservation jusqu’à la fin du créneau. Le producteur peut ajuster la
      quantité réservée ; il en informe lui-même l’acheteur.
    </p>
    <p>
      Une réservation n’est pas un paiement. Le paiement et la remise des produits se font directement entre le
      producteur et l’acheteur, en dehors du Site. L’Éditeur n’est pas partie à la vente et n’intervient pas dans son
      exécution. Le producteur et l’acheteur s’engagent à honorer les réservations ou à prévenir l’autre partie dans les
      meilleurs délais.
    </p>

    <h2>6. Alertes et producteurs suivis</h2>
    <p>
      Vous pouvez suivre des producteurs et recevoir un e-mail lors de leurs nouvelles annonces. Ces alertes, comme
      celles qui préviennent un producteur de l’expiration de ses annonces, se désactivent à tout moment depuis la page
      « Mes alertes » de votre compte.
    </p>

    <h2>7. Responsabilités</h2>
    <p>
      Pour les annonces et les informations publiées par les utilisateurs, l’Éditeur agit en tant qu’hébergeur au sens
      de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN). Il ne contrôle pas ces
      contenus avant leur publication. Il ne garantit ni la qualité, ni la conformité, ni la disponibilité des produits
      proposés.
    </p>
    <p>
      L’Éditeur s’efforce de rendre le Site accessible, sans pouvoir le garantir en permanence. Il peut l’interrompre,
      notamment pour maintenance, sans que sa responsabilité puisse être engagée.
    </p>
    <p>
      Chaque utilisateur est responsable de l’usage qu’il fait du Site et des coordonnées des autres utilisateurs. Il
      s’interdit tout usage illicite, frauduleux ou contraire à l’objet du Site (démarchage, spam, collecte automatisée
      de données…).
    </p>

    <h2>8. Signaler un contenu</h2>
    <p>
      Pour signaler une annonce ou un contenu illicite, écrivez à <ContactLink /> en indiquant l’adresse de la page
      concernée et la raison de votre signalement. L’Éditeur le traitera dans les meilleurs délais.
    </p>

    <h2>9. Suspension et suppression du compte</h2>
    <p>
      L’Éditeur peut suspendre ou supprimer un compte en cas de manquement aux CGU, après avoir, sauf urgence, invité
      l’utilisateur à s’expliquer.
    </p>
    <p>
      Vous pouvez demander la suppression de votre compte à tout moment en écrivant à <ContactLink />. Vos annonces et
      vos données sont alors supprimées, dans les conditions prévues par la charte.
    </p>

    <h2>10. Données personnelles</h2>
    <p>
      Le traitement de vos données personnelles et l’usage des cookies sont décrits dans{" "}
      <PageLink href="/charte">notre charte de respect de la vie privée</PageLink>.
    </p>

    <h2>11. Propriété intellectuelle</h2>
    <p>
      Le Site, sa présentation et ses éléments propres (nom, logo, textes, mise en page) appartiennent à l’Éditeur. Leur
      reproduction sans autorisation est interdite.
    </p>
    <p>
      Le producteur conserve ses droits sur les textes et photos de ses annonces. Il autorise l’Éditeur à les afficher
      gratuitement sur le Site, pendant la durée de leur publication, pour les besoins de son fonctionnement.
    </p>

    <h2>12. Modification des CGU</h2>
    <p>
      L’Éditeur peut modifier les CGU. La date de dernière mise à jour figure en haut de page. Continuer à utiliser le
      Site après une modification vaut acceptation des nouvelles CGU.
    </p>

    <h2>13. Droit applicable</h2>
    <p>
      Les CGU sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité, en
      écrivant à <ContactLink />. À défaut, les tribunaux français seront compétents.
    </p>
  </Layout>
)

export default TermsPage
