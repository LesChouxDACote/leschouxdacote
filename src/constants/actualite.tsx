import { ReactNode } from "react"
import Link from "src/components/Link"

// Articles repris du blog WordPress (informationleschouxdacote.wordpress.com/blog/) le 2 novembre 2026, du plus récent
// au plus ancien ; l'article d'exemple de WordPress (« Présentation personnelle »), « Appel à volontaires », « Nouveau !
// Les produits issus de l'Agriculture Biologique / Raisonnée à l'honneur » et « Producteurs, communiquez plus
// facilement sur vos produits en vente directe » sont laissés de côté.
// Les photos du blog sont remplacées par des photos libres (Unsplash) dans public/actualite/.

export interface Article {
  slug: string
  title: string
  date: string // AAAA-MM-JJ
  author: string
  image: string
  summary: string
  body: ReactNode
}

const ext = { target: "_blank", rel: "noopener" }

const CallToAction = () => (
  <p>
    <Link href="/inscription">Publier une annonce</Link> · <Link href="/recherche">Trouver des producteurs</Link>
  </p>
)

export const ARTICLES: Article[] = [
  {
    slug: "la-presse-en-parle-maddyness",
    title: "La presse en parle : Maddyness",
    date: "2022-01-11",
    author: "Margot Dauban",
    image: "/actualite/presse.jpg",
    summary:
      "Maddyness, média de référence de l'écosystème entrepreneurial français, s'est intéressé au projet Les Choux d'à Côté.",
    body: (
      <>
        <p>
          Maddyness, média de référence de l&apos;écosystème entrepreneurial français, s&apos;est intéressé au projet
          Les Choux d&apos;à Côté.
        </p>
        <p>
          <a href="https://www.maddyness.com/2021/12/16/les-choux-da-cote-producteurs-vente-directe-tools/" {...ext}>
            Lire l&apos;article
          </a>
        </p>
      </>
    ),
  },
  {
    slug: "vente-directe-a-la-ferme-pourquoi-et-comment-sy-mettre",
    title: "Vente directe à la ferme : pourquoi et comment s'y mettre ?",
    date: "2021-12-15",
    author: "Margot Dauban",
    image: "/actualite/vente-a-la-ferme.jpg",
    summary:
      "La vente à la ferme rencontre un fort engouement, porté par le retour des produits locaux et l'essor de l'agritourisme. Nos conseils pour se lancer.",
    body: (
      <>
        <p>
          La vente à la ferme rencontre un fort engouement : d&apos;une part grâce au regain d&apos;intérêt pour le
          circuit court et les produits locaux depuis la crise sanitaire, d&apos;autre part grâce à l&apos;essor de
          l&apos;agritourisme en France. Les producteurs souhaitent garder la main sur leur distribution, et les
          consommateurs sont de plus en plus attentifs à la qualité et à l&apos;origine de leur alimentation.
        </p>
        <p>
          L&apos;opportunité est réelle, mais le projet comporte de nombreuses contraintes : il doit être mûrement
          réfléchi.
        </p>

        <h2>Les avantages de la vente directe à la ferme</h2>
        <ul>
          <li>
            <strong>La traçabilité</strong> : le produit passe de la main du producteur à celle du consommateur,
            quasiment sans transport.
          </li>
          <li>
            <strong>Une rémunération plus juste</strong> : sans intermédiaire, le revenu s&apos;améliore ; des revenus
            diversifiés stabilisent l&apos;exploitation, et le producteur échappe aux règles des distributeurs
            (calibrage des produits, par exemple).
          </li>
          <li>
            <strong>Une relation renforcée</strong> : rencontrer les acheteurs, c&apos;est recevoir directement leur
            avis sur son travail.
          </li>
        </ul>
        <p>
          <strong>22&nbsp;% des consommateurs</strong> achètent à la ferme au moins une fois par mois (source : CERD),
          et <strong>48&nbsp;% des producteurs</strong> en circuit court privilégient la vente à la ferme (source : SSP
          – Agreste – Recensement agricole 2010).
        </p>

        <h2>Vente directe à la ferme : quelques clés pour se lancer</h2>
        <p>Le producteur endosse de nouveaux rôles, en particulier ceux de commerçant et de communicant.</p>

        <h3>Faire le point sur l&apos;existant</h3>
        <p>Avant de se lancer, il est nécessaire de faire le point sur les moyens dont vous disposez :</p>
        <ul>
          <li>
            Votre exploitation est-elle sur un axe passant, près d&apos;une ville ou d&apos;un site touristique, ou
            isolée&nbsp;?
          </li>
          <li>Disposez-vous déjà d&apos;équipements, de locaux, de main-d&apos;œuvre ?</li>
          <li>Avez-vous le temps, les compétences et le financement nécessaires ?</li>
        </ul>
        <p>
          Les réponses dessinent les prochaines étapes : construire ou rénover, déléguer certaines tâches, se former,
          prévoir sa communication.
        </p>

        <h3>S&apos;informer sur les différentes réglementations</h3>
        <ul>
          <li>Le local doit être accessible à tous et respecter les normes de sécurité incendie.</li>
          <li>Les règles d&apos;hygiène et de sécurité alimentaire s&apos;appliquent : stockage, chaîne du froid…</li>
          <li>Le code de la consommation aussi, notamment pour l&apos;étiquetage des produits.</li>
        </ul>

        <h3>Organiser l&apos;accueil à la ferme</h3>
        <ul>
          <li>Aménager un espace de vente : présentoirs, moyen de paiement, réfrigérateur si besoin.</li>
          <li>
            Choisir ses horaires : ouverture en continu (au risque d&apos;être souvent interrompu) ou créneaux fixes,
            comme le soir ou le samedi matin.
          </li>
        </ul>
        <p>
          Le principal frein cité par les producteurs reste la nécessité d&apos;une{" "}
          <strong>disponibilité importante</strong>.
        </p>

        <h3>Communiquer sur votre activité</h3>
        <p>
          L&apos;effort à fournir dépend de votre visibilité actuelle et du bouche-à-oreille (marchés, AMAP…). Plusieurs
          pistes :
        </p>
        <ul>
          <li>des panneaux en bord de route, avec l&apos;autorisation du gestionnaire de la voirie ;</li>
          <li>une page Facebook ou Instagram ;</li>
          <li>
            des annonces sur <Link href="/">Les Choux d&apos;à Côté</Link> ;
          </li>
          <li>
            une fiche Google My Business ou un site internet, avec éventuellement du click and collect ou un drive ;
          </li>
          <li>
            l&apos;adhésion à{" "}
            <a href="https://www.bienvenue-a-la-ferme.com/" {...ext}>
              Bienvenue à la Ferme
            </a>{" "}
            ;
          </li>
          <li>
            les annuaires de producteurs, comme{" "}
            <a href="https://www.fraisetlocal.fr/" {...ext}>
              Frais et Local
            </a>{" "}
            ;
          </li>
          <li>
            les outils tout-en-un, comme{" "}
            <a href="https://coopcircuits.fr/" {...ext}>
              Coop Circuits
            </a>
            .
          </li>
        </ul>

        <p>
          Ces conseils ne sont pas exhaustifs : n&apos;hésitez pas à contacter votre{" "}
          <strong>Chambre d&apos;Agriculture</strong>. Une fois prêt, publiez vos annonces sur Les Choux d&apos;à Côté,
          qui accueille tous les produits alimentaires, transformés ou non.
        </p>
        <CallToAction />
      </>
    ),
  },
  {
    slug: "vente-directe-circuit-court-on-revoit-les-bases",
    title: "Vente directe, circuit court : on revoit les bases !",
    date: "2021-12-07",
    author: "Margot Dauban",
    image: "/actualite/circuit-court.jpg",
    summary:
      "Consommer local et de saison s'installe durablement, mais le terme « circuit court » est souvent mal employé. Petit rappel des définitions.",
    body: (
      <>
        <p>
          Consommer des produits locaux et de saison est une tendance durable en France. Pourtant, le terme « circuit
          court alimentaire » est souvent mal employé, parfois même comme un mot magique par des entreprises qui
          cherchent à regagner la confiance des consommateurs.
        </p>

        <h2>Qu&apos;est-ce que le circuit court ?</h2>
        <p>
          On l&apos;associe souvent à tort à la distance. Selon le{" "}
          <a
            href="https://www.economie.gouv.fr/dgccrf/Publications/Vie-pratique/Fiches-pratiques/produits-alimentaires-commercialises-en-circuits-courts-0"
            {...ext}
          >
            Code de la Consommation
          </a>
          , il dépend uniquement du nombre d&apos;intermédiaires financiers : zéro ou un seul.
        </p>
        <ul>
          <li>
            <strong>Vente directe</strong> : aucun intermédiaire (<em>Producteur → Client</em>) ;
          </li>
          <li>
            <strong>Vente indirecte</strong> : un intermédiaire (<em>Producteur → Détaillant → Client</em>) ;
          </li>
          <li>
            <strong>Circuit long</strong> : plusieurs intermédiaires (
            <em>Producteur → Grossiste → Détaillant → Client</em>).
          </li>
        </ul>
        <p>
          L&apos;intermédiaire est généralement un commerçant ou un service numérique, comme{" "}
          <a href="https://laruchequiditoui.fr/fr" {...ext}>
            La Ruche qui dit oui !
          </a>{" "}
          Le Laboratoire de l&apos;ESS y ajoute une dimension sociale, autour de quatre critères : le lien social et la
          coopération, l&apos;équité financière, la participation et l&apos;éducation.
        </p>

        <h2>Qu&apos;est-ce que la vente directe ?</h2>
        <p>
          C&apos;est une forme de circuit court, en excluant toute forme d&apos;intermédiaire. Le producteur assure
          toutes les étapes, de la récolte à la vente : plus de travail, mais aussi de meilleures marges et une
          clientèle locale fidèle.
        </p>
        <p>
          <Link href="/actualite/les-differentes-formes-de-vente-directe">Quelques exemples de vente directe</Link> : la
          vente à la ferme, les marchés de producteurs, les AMAP, les tournées de livraison, les stands en bord de
          route…
        </p>
        <p>
          💡 La plateforme <Link href="/">Les Choux d&apos;à Côté</Link> met en relation producteurs et acheteurs sans
          jouer le rôle d&apos;intermédiaire.
        </p>

        <h2>Et la proximité dans tout ça ?</h2>
        <p>
          On parle généralement de circuit court « local » quand moins de <strong>150 km</strong> séparent la production
          de la consommation. L&apos;ADEME propose des limites plus strictes : 30 km pour les produits agricoles bruts
          et 80 km pour les produits transformés.
        </p>
        <p>
          Ni la vente directe ni le circuit court n&apos;impliquent donc forcément la proximité : acheter de la vanille
          directement à un producteur de Madagascar, c&apos;est de la vente directe, mais pas du local !
        </p>
        <p>
          Nos choix alimentaires ont un impact social et environnemental : à chacun de faire des choix éclairés, selon
          ses moyens.
        </p>
      </>
    ),
  },
  {
    slug: "les-differentes-formes-de-vente-directe",
    title: "Les différentes formes de vente directe",
    date: "2021-11-30",
    author: "Margot Dauban",
    image: "/actualite/formes-vente-directe.jpg",
    summary:
      "Vente à la ferme, marchés, AMAP, drive fermier : tour d'horizon des principales formes de vente directe, du producteur à l'acheteur, sans intermédiaire.",
    body: (
      <>
        <p>
          La <Link href="/">vente directe</Link> est un échange entre le producteur et l&apos;acheteur final, qui ne
          passe par aucun intermédiaire. Elle se déroule souvent sur l&apos;exploitation ou à proximité, et relève du
          circuit court.
        </p>
        <p>
          La vente de gré à gré séduit à nouveau : elle offre aux « consomm&apos;acteurs » traçabilité, saisonnalité et
          juste rémunération des producteurs, tout en profitant à l&apos;économie locale. L&apos;offre se diversifie
          pour répondre à une consommation « locavore ». Voici les 4 formes principales de vente directe.
        </p>

        <h2>La vente directe à la ferme</h2>
        <p>
          C&apos;est le circuit le plus court possible, « de la fourche à la fourchette ». De nombreux producteurs
          aménagent sur leur exploitation un local réservé à la vente de leurs produits fermiers. Le client rencontre le
          producteur et découvre son lieu de travail : une transparence totale sur le produit et son origine.
        </p>
        <p>
          Pour trouver ces producteurs : le site de l&apos;exploitation, un annuaire régional ou la plateforme{" "}
          <Link href="/">Les Choux d&apos;à Côté</Link>.
        </p>

        <h2>Les marchés alimentaires</h2>
        <p>
          On compte plus de 10 000 marchés en France. Leurs atouts : des produits de qualité et de saison, du lien
          social, une clientèle fidèle. Pour les producteurs, obtenir un emplacement est ardu, et tous ne se valent pas.
          Sans compter la logistique et la fatigue, surtout sous la pluie ou en hiver.
        </p>
        <ul>
          <li>
            <strong>Le marché de producteurs</strong> est réservé aux producteurs : les produits locaux y sont garantis.
          </li>
          <li>
            <strong>Le marché de plein vent</strong> mêle producteurs, revendeurs, commerçants et artisans : la vente
            n&apos;y est pas toujours directe, et l&apos;origine peut être lointaine.
          </li>
        </ul>
        <p>Quelques indices pour reconnaître un vrai producteur local :</p>
        <ul>
          <li>un étal plus petit, qui se vide plus vite ;</li>
          <li>un discours passionné sur ses produits ;</li>
          <li>une offre uniquement de saison ;</li>
          <li>des produits non calibrés (les fruits et légumes « moches »).</li>
        </ul>

        <h2>Les AMAP</h2>
        <p>
          Dans une{" "}
          <a href="http://www.reseau-amap.org/" {...ext}>
            AMAP
          </a>
          , un ou plusieurs producteurs locaux s&apos;engagent à livrer une quantité et une variété de produits à un
          nombre d&apos;adhérents connu d&apos;avance. Le contenu des paniers change chaque semaine, selon les récoltes
          et la météo ; les adhérents paient tout ou partie à l&apos;avance, en général sur 6 mois.
        </p>
        <p>
          Les producteurs y gagnent une avance de trésorerie, des prix plus rémunérateurs qu&apos;en grande
          distribution, une reconnaissance sociale et des échanges réguliers avec les consommateurs. Les adhérents, eux,
          profitent de produits du terroir toute l&apos;année, de variétés anciennes ou oubliées, à un prix abordable,
          pas plus élevé qu&apos;en grande surface : un geste citoyen qui rapproche la campagne et la ville.
        </p>

        <h2>Le drive fermier</h2>
        <p>
          Lancé à l&apos;origine par la grande distribution, le drive fermier s&apos;est fortement développé depuis le
          premier confinement : on achète ou réserve en ligne, puis on retire son panier au lieu et à la date fixés. Il
          séduit des consommateurs connectés, parfois pressés, qui veulent la praticité d&apos;Internet sans perdre le
          contact humain.
        </p>
        <p>
          On ne parle de vente directe que si le producteur prépare et livre lui-même les commandes. Beaucoup rejoignent
          des drives collectifs et délèguent une partie de la logistique à un intermédiaire ; les principaux réseaux en
          France sont La Ruche qui dit oui ! et Bienvenue à la Ferme.
        </p>

        <h2>
          Développer ses ventes directes via Internet tout en gardant son indépendance : oui, c&apos;est possible !
        </h2>
        <p>
          Fruits, légumes, fromages, viande, miel : la demande grandit pour des produits issus d&apos;une production
          responsable, et la vente directe en offre une solide garantie. Aux quatre formes décrites s&apos;ajoutent la
          vente en bord de route et la cueillette, surtout à la campagne.
        </p>
        <p>
          De nouvelles initiatives numériques veulent redynamiser les petites exploitations et favoriser une
          alimentation locale, saine et résiliente. Sur la{" "}
          <Link href="/actualite/avantages-plateforme-vente-directe">plateforme de vente directe</Link> Les Choux
          d&apos;à Côté, les producteurs publient des annonces, quel que soit leur mode de distribution, et développent
          un réseau local sans intermédiaire.
        </p>
        <p>Producteur ou consomm&apos;acteur, Les Choux d&apos;à Côté vous intéresse ?</p>
        <CallToAction />
      </>
    ),
  },
  {
    slug: "avantages-plateforme-vente-directe",
    title: "Les avantages d'une plateforme de vente directe",
    date: "2021-11-30",
    author: "Margot Dauban",
    image: "/actualite/plateforme.jpg",
    summary:
      "70 % des Français privilégient l'alimentation locale, mais la vente directe ne pèse que 5 à 10 % de leur consommation. Une plateforme peut aider producteurs et acheteurs.",
    body: (
      <>
        <p>
          Selon une étude Ifop, 70 % des Français privilégient l&apos;alimentation locale et veulent soutenir
          l&apos;agriculture bio et paysanne. Pourtant, la{" "}
          <Link href="/actualite/les-differentes-formes-de-vente-directe">vente directe</Link> ne pèse que 5 à 10 % de
          la consommation alimentaire en France.
        </p>
        <p>
          Ce décalage entre les intentions et l&apos;offre locale s&apos;explique : se lancer en vente directe demande
          un investissement aux producteurs. Des outils numériques, en particulier les plateformes spécialisées comme{" "}
          <Link href="/">Les Choux d&apos;à Côté</Link>, profitent à la fois aux producteurs et aux consommateurs
          locavores.
        </p>

        <h2>Les avantages d&apos;une plateforme de vente directe pour les producteurs</h2>

        <h3>Booster sa visibilité en ligne</h3>
        <p>
          La plateforme n&apos;est pas un canal de vente à proprement parler : elle ne remplace ni le marché, ni le
          drive fermier, ni l&apos;AMAP, mais sert d&apos;outil de communication complémentaire pour mettre en valeur
          ses produits : fruits et légumes, produits laitiers, miel, viandes…
        </p>
        <ol>
          <li>Les annonces sont référencées par Google.</li>
          <li>La fiche producteur, qui rassemble toutes ses annonces, apparaît aussi dans les moteurs de recherche.</li>
          <li>Chaque nouvelle annonce envoie une alerte par e-mail aux acheteurs du secteur.</li>
          <li>Les annonces se partagent en un clic, dans un groupe Facebook ou sur WhatsApp par exemple.</li>
        </ol>

        <h3>Développer sa clientèle locale</h3>
        <p>
          Comme un annuaire, la plateforme touche un public plus large qu&apos;un site isolé, mais la recherche porte
          sur les produits plutôt que sur les producteurs. Le paiement et la livraison se règlent hors plateforme, de
          gré à gré : la transaction en personne crée une relation de proximité, fidélise la clientèle et apporte des
          retours concrets pour mieux répondre aux attentes.
        </p>

        <h3>Augmenter son chiffre d&apos;affaires</h3>
        <p>
          Le modèle est non contraignant : les producteurs vendent en toute indépendance, sans les conditions imposées
          par la grande distribution ou les marketplaces. Ils choisissent librement leur mode de distribution et leurs
          prix, et la plateforme ne prélève aucune commission : de meilleures marges, et moins d&apos;exposition aux
          fluctuations des prix du marché.
        </p>

        <h2>Les avantages d&apos;une plateforme de vente directe pour les acheteurs</h2>

        <h3>Profiter de la praticité d&apos;Internet…</h3>
        <p>
          De toutes générations, les Français sont attirés par les circuits courts et très connectés : leur premier
          réflexe est de chercher en ligne. La plateforme permet de repérer les produits proches de chez soi et de
          connaître leur mode de production (bio, agriculture raisonnée, labels).
        </p>

        <h3>…Tout en préservant le contact humain</h3>
        <p>
          Le parcours commence en ligne mais se termine en face-à-face avec l&apos;agriculteur ou l&apos;éleveur. La
          vente directe renforce le lien social, valorise des métiers essentiels mais souvent méconnus, et répond à la
          quête de sens des « consomm&apos;acteurs ».
        </p>

        <h3>S&apos;offrir la garantie de consommer local et de saison</h3>
        <p>
          C&apos;est renouer avec la terre et le rythme des saisons : légumes « oubliés » en hiver, paniers abondants en
          été. Issus d&apos;une agriculture non intensive, les produits fermiers sont plus frais et plus sains, et le
          circuit court garantit leur traçabilité.
        </p>

        <h2>S&apos;alimenter de manière responsable</h2>
        <p>
          La vente directe assure une rémunération équitable, puisque tout l&apos;argent revient au producteur ; elle
          est souvent plus avantageuse et plus transparente pour le consommateur, et soutient l&apos;économie locale.
          Moins d&apos;emballages, d&apos;énergie et de transport, des récoltes plus modestes et mieux maîtrisées :
          c&apos;est aussi moins de gaspillage.
        </p>
        <CallToAction />
      </>
    ),
  },
  {
    slug: "les-choux-da-cote-vous-votre-avis-nous-interesse",
    title: "Les Choux d'à Côté & vous : votre avis nous intéresse !",
    date: "2021-10-13",
    author: "Les Choux d'à Côté",
    image: "/actualite/questionnaire.jpg",
    summary:
      "Producteurs, acheteurs locavores, déjà conquis ou encore hésitants : 2 minutes pour nous aider à améliorer la plateforme.",
    body: (
      <>
        <p>
          Producteurs, acheteurs locavores, déjà conquis ou encore hésitants : votre avis sur{" "}
          <Link href="/">Les Choux d&apos;à Côté</Link> nous intéresse ! Répondre à{" "}
          <a href="https://bit.ly/3v68xWa" {...ext}>
            ce questionnaire
          </a>{" "}
          vous prendra 2 minutes maximum.
        </p>
        <p>Vos retours sont précieux, ils nous aident à :</p>
        <ul>
          <li>orienter correctement les choix de conception de la plateforme ;</li>
          <li>perfectionner notre communication ;</li>
          <li>appuyer les demandes de financement indispensables au développement du projet.</li>
        </ul>
        <p>
          👉{" "}
          <a href="https://bit.ly/3v68xWa" {...ext}>
            Répondre au questionnaire
          </a>
        </p>
        <p>Merci pour votre contribution !</p>
      </>
    ),
  },
]
