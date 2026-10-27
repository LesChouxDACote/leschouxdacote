import styled from "@emotion/styled"
import { COLORS, CONTACT_EMAIL, LAYOUT } from "src/constants"
import Layout from "src/layout"

// Texte de la charte repris mot pour mot du Google Doc de l'Éditeur : toute modification passe par ce document.

const TextLink = styled.a`
  text-decoration: underline;
`
const TableWrapper = styled.div`
  margin: 16px 0;
  @media (max-width: ${LAYOUT.mobile}px) {
    overflow-x: auto;
  }
`
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  @media (max-width: ${LAYOUT.mobile}px) {
    min-width: 700px;
  }
  th,
  td {
    border: 1px solid ${COLORS.border};
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-weight: bold;
  }
`

const DATA_HEADERS = ["Traitement", "Données", "Finalité", "Base légale", "Durée de conservation"]
const DATA_ROWS = [
  [
    "Création et gestion du compte",
    "nom, prénom, email, mot de passe chiffré, téléphone, ville…",
    "Accès à l'espace personnel, utilisation du Site",
    "Exécution du contrat (CGU)",
    "Durée du compte, puis 3 ans maximum après la dernière activité",
  ],
  [
    "Publication d'annonces",
    "Contenu de l'annonce, photos, localisation",
    "Permettre aux acheteurs de trouver les produits",
    "Exécution du contrat",
    "Durée de l'annonce, puis suppression",
  ],
  [
    "Mise en relation",
    "Prénom, nom, email et téléphone de l'acheteur, détail de la réservation (annonce, créneau, quantité) ; coordonnées de contact du vendeur affichées sur l'annonce",
    "Mettre en contact acheteurs et vendeurs",
    "Exécution du contrat",
    "Durée du compte",
  ],
  [
    "Recherche d'annonces",
    "Termes recherchés, filtres",
    "Fournir un moteur de recherche rapide",
    "Intérêt légitime (fonctionnement du service)",
    "90 jours",
  ],
  [
    "Emails liés au service",
    "Email, nom",
    "Confirmation, notifications, réinitialisation de mot de passe",
    "Exécution du contrat",
    "Durée du compte",
  ],
  [
    "Newsletter / informations",
    "Email",
    "Vous informer des évolutions du Site",
    "Consentement",
    "Jusqu'au retrait du consentement",
  ],
  [
    "Mesure d'audience (Google Analytics)",
    "Identifiants de navigation, pages vues, durée, appareil, localisation approximative",
    "Comprendre l'usage du Site et l'améliorer",
    "Consentement",
    "Cookies : 13 mois maximum. Données : 14 mois maximum.",
  ],
  [
    "Sécurité et fonctionnement",
    "Adresse IP, journaux de connexion",
    "Sécurité, prévention des abus",
    "Intérêt légitime",
    "6 à 12 mois",
  ],
]

const PROVIDER_HEADERS = ["Prestataire", "Rôle", "Localisation / transferts"]
const PROVIDER_ROWS = [
  [
    "Google (Firebase)",
    "authentification, base de données, stockage…",
    "Google peut traiter des données hors UE (États-Unis). Transferts encadrés par le Data Privacy Framework et/ou des clauses contractuelles types",
  ],
  ["Google (Analytics)", "Mesure d'audience, uniquement après consentement", "Idem"],
  ["Algolia", "Moteur de recherche d'annonces", "Europe"],
  ["Mailjet", "Envoi des emails", "Union européenne"],
  [
    "Vercel",
    "Hébergement du Site et des données",
    "États-Unis (transferts encadrés par le Data Privacy Framework et/ou les clauses contractuelles types)",
  ],
]

interface TableProps {
  headers: string[]
  rows: string[][]
}

const CharterTable = ({ headers, rows }: TableProps) => (
  <TableWrapper>
    <Table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={index}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  </TableWrapper>
)

const ContactLink = () => <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>

const CharterPage = () => {
  return (
    <Layout title="Notre charte">
      <h1>Charte de respect de la vie privée – leschouxdacote.fr</h1>
      <p>Dernière mise à jour : 27 octobre 2026.</p>

      <h2>1. Qui sommes-nous ?</h2>
      <p>
        Le site leschouxdacote.fr (le « Site ») permet à des producteurs de produits alimentaires et à des acheteurs de
        se trouver et de se mettre en relation directement, sans intermédiaire.
      </p>
      <p>
        Le Site est édité à titre personnel et non professionnel par Anthony NGUYEN (l&apos;« Éditeur »), qui est le
        responsable du traitement de vos données personnelles.
      </p>
      <p>
        Contact : <ContactLink />
      </p>
      <p>
        Aucun délégué à la protection des données (DPO) n&apos;a été désigné. Toute question sur vos données peut être
        adressée à l&apos;adresse ci-dessus.
      </p>
      <p>
        Cette Charte s&apos;applique avec les Conditions Générales d&apos;Utilisation. Elle respecte le Règlement
        général sur la protection des données (RGPD) et la loi Informatique et Libertés.
      </p>

      <h2>2. Quelles données, pourquoi, et sur quelle base ?</h2>
      <CharterTable headers={DATA_HEADERS} rows={DATA_ROWS} />
      <p>
        Nous ne demandons pas de données dites « sensibles » (origine, opinions politiques ou religieuses, santé…). Nous
        vous invitons à ne pas en saisir dans les champs libres (annonces, messages).
      </p>

      <h2>3. Mise en relation entre utilisateurs</h2>
      <p>
        Le but du Site est de vous mettre en contact avec d&apos;autres utilisateurs. À ce titre, certaines de vos
        données sont visibles par d&apos;autres personnes :
      </p>
      <ul>
        <li>Visibles publiquement avec votre annonce : prénom, ville, contenu de l&apos;annonce, etc.</li>
        <li>
          Visibles uniquement par les utilisateurs connectés, ou transmises lors d’une réservation : ex. email,
          téléphone.
        </li>
      </ul>
      <p>
        Vous choisissez les informations que vous publiez. Nous vous recommandons de ne pas diffuser plus de coordonnées
        que nécessaire. Une fois vos coordonnées transmises à un autre utilisateur, celui-ci devient responsable de
        l&apos;usage qu&apos;il en fait. Nous ne maîtrisons pas cet usage.
      </p>

      <h2>4. Cookies et mesure d&apos;audience</h2>
      <p>Un cookie est un petit fichier déposé sur votre appareil lors de la visite d&apos;un site.</p>
      <ul>
        <li>
          Cookies strictement nécessaires : ils permettent la connexion à votre compte et la sécurité du Site. Ils ne
          nécessitent pas votre accord.
        </li>
        <li>
          Cookies de mesure d&apos;audience (Google Analytics) : nous utilisons Google Analytics, un service de Google,
          pour savoir comment le Site est utilisé. Ces cookies ne sont déposés qu&apos;avec votre consentement.
        </li>
      </ul>
      <p>
        À votre première visite, un bandeau vous permet d&apos;accepter ou de refuser ces cookies, avec la même
        facilité. Votre refus n&apos;empêche pas l&apos;utilisation du Site.
      </p>
      <p>Vous pouvez modifier votre choix à tout moment via le lien « Gérer mes cookies » en bas de chaque page.</p>
      <p>
        Votre choix est conservé 6 à 13 mois, puis nous vous le redemanderons. Les cookies durent 13 mois au maximum.
      </p>
      <p>Les données recueillies par Google Analytics sont transmises à Google (voir section 5).</p>
      <p>
        Plus d&apos;informations :{" "}
        <TextLink href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" rel="noopener">
          cnil.fr/fr/cookies-et-autres-traceurs
        </TextLink>
        .
      </p>

      <h2>5. Qui reçoit vos données ?</h2>
      <p>
        Vos données ne sont pas vendues. Elles sont accessibles uniquement à l&apos;Éditeur et aux prestataires
        techniques suivants, qui les traitent pour notre compte :
      </p>
      <CharterTable headers={PROVIDER_HEADERS} rows={PROVIDER_ROWS} />
      <p>
        Nous pouvons être amenés à communiquer vos données aux autorités administratives ou judiciaires lorsque la loi
        l&apos;exige.
      </p>

      <h2>6. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données (accès
        restreints, chiffrement des mots de passe, connexions sécurisées, etc. ). Aucune mesure n&apos;étant
        infaillible, nous ne pouvons garantir une sécurité absolue. Il vous appartient de garder votre mot de passe
        confidentiel.
      </p>
      <p>
        En cas de violation de données susceptible d&apos;engendrer un risque pour vos droits, nous en informerons la
        CNIL dans les 72 heures et, si le risque est élevé, les personnes concernées.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous disposez des droits suivants : accès, rectification, effacement, limitation, opposition, portabilité,
        retrait du consentement à tout moment, et définition de directives sur le sort de vos données après votre décès.
      </p>
      <p>
        Pour les exercer, écrivez à <ContactLink /> en précisant votre demande. Nous pouvons vous demander un
        justificatif d&apos;identité en cas de doute raisonnable.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL :{" "}
        <TextLink href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">
          cnil.fr/fr/plaintes
        </TextLink>
        .
      </p>

      <h2>8. Mineurs</h2>
      <p>Le Site s&apos;adresse aux personnes majeures. Il n&apos;est pas destiné aux moins de 18 ans.</p>

      <h2>9. Modification de la Charte</h2>
      <p>Nous pouvons modifier cette Charte. La date de dernière mise à jour figure en haut de page.</p>
    </Layout>
  )
}

export default CharterPage
