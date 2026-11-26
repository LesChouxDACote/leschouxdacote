import { COLORS, CONTACT_EMAIL } from "src/constants"

export const ARTICLE_PATH = "/actualite/reservation-et-nouveautes-2026"
export const DEFAULT_SITE_URL = "https://leschouxdacote.fr"

// Campagne de la newsletter « réservation » : sert à noter qui l'a déjà reçue (pas de doublon à la relance).
export const NEWSLETTER_CAMPAIGN_ID = "reservation-2026"
// Premier envoi en production : l'historique de l'envoi (Mailjet) est relu à partir de ce jour.
export const NEWSLETTER_CAMPAIGN_START = "2026-11-24"

export interface ScheduleStep {
  day: string
  channel: string
  audience: string
  goal: string
  tip: string
}

export interface SocialPostVariant {
  id: string
  label: string
  text: string
}

export interface SocialPost {
  id: string
  channel: string
  audience: string
  angle: string
  visualIdea: string
  variants: SocialPostVariant[]
  hashtags?: string
}

export interface NewsletterEmail {
  subject: string
  preheader: string
  html: string
  text: string
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "")

export const COMMUNICATION_SCHEDULE: ScheduleStep[] = [
  {
    day: "Jour 1 (mardi matin)",
    channel: "Article Actualité + Newsletter",
    audience: "Producteurs et acheteurs inscrits",
    goal: "Annoncer officiellement la reprise, la réservation sur créneaux et les nouveautés de l'année.",
    tip: "Envoyer la newsletter entre 9h et 11h, avec le lien vers le nouvel article Actualité comme page de référence.",
  },
  {
    day: "Jour 2 (mercredi midi)",
    channel: "Facebook",
    audience: "Communauté locale (producteurs & acheteurs)",
    goal: "Partager l'annonce de façon conviviale et encourager les premiers commentaires et partages locaux.",
    tip: "Joindre une capture d'écran d'une annonce avec bouton « Réserver » ou la photo de l'article, et mettre le lien en fin de message.",
  },
  {
    day: "Jour 3 (jeudi matin)",
    channel: "LinkedIn",
    audience: "Réseau professionnel, entrepreneurs et acteurs du numérique",
    goal: "Raconter la relance du projet malgré une activité professionnelle classique, grâce à l'IA agentique et Kedalia.",
    tip: "Publier entre 8h30 et 10h en identifiant Charles Ilieff et Kedalia ; répondre aux premiers commentaires dans l'heure.",
  },
  {
    day: "Jour 4 (vendredi fin d'après-midi)",
    channel: "Instagram",
    audience: "Consommateurs locaux et producteurs actifs",
    goal: "Montrer concrètement la simplicité de la réservation en quelques visuels avant les marchés du week-end.",
    tip: "Publier en carrousel de 4 images puis relayer le lien de l'article en story avec un sticker lien.",
  },
  {
    day: "Jour 5 (samedi matin)",
    channel: "X",
    audience: "Veille circuits courts, tech et utilisateurs curieux",
    goal: "Diffuser un message court percutant ou un fil en 3 messages mettant en avant la nouveauté et la relance.",
    tip: "Utiliser le message court pour l'annonce directe, ou le fil en 3 messages pour donner davantage de contexte.",
  },
  {
    day: "Jour 7 (lundi suivant)",
    channel: "Relance producteurs (Facebook / Instagram)",
    audience: "Producteurs locaux",
    goal: "Inviter les producteurs à ajouter leurs prochains créneaux de retrait dès cette semaine.",
    tip: "Partager directement le lien vers le guide « Créer des créneaux de retrait » dans la rubrique Assistance.",
  },
]

export const getSocialPosts = (baseUrl: string): SocialPost[] => {
  const siteUrl = normalizeBaseUrl(baseUrl)
  const articleUrl = `${siteUrl}${ARTICLE_PATH}`
  const helpSlotsUrl = `${siteUrl}/aide/creneaux`

  return [
    {
      id: "facebook",
      channel: "Facebook",
      audience: "Producteurs et acheteurs locaux",
      angle: "Reprise chaleureuse, arrivée de la réservation en vente directe et tour d'horizon des nouveautés.",
      visualIdea:
        "La photo de légumes de l'article Actualité ou un montage avant/après montrant une annonce avec ses créneaux et le bouton « Réserver ».",
      variants: [
        {
          id: "facebook-annonce",
          label: "Publication d'annonce",
          text: [
            "🥕 De grandes nouvelles sur Les Choux d'à Côté !",
            "",
            "Cela faisait plusieurs années que nous n'avions pas publié ici — la reprise d'une activité professionnelle classique m'ayant laissé moins de temps pour animer le projet. Mais Les Choux d'à Côté n'a jamais disparu… et cette année, la plateforme fait peau neuve avec une nouveauté que vous attendiez beaucoup :",
            "",
            "👉 La réservation de produits sur créneaux est en ligne !",
            "",
            "Toujours 100 % en vente directe et sans intermédiaire :",
            "👩‍🌾 Producteurs : ajoutez vos créneaux de retrait (ferme, marché, point de retrait), fixez votre stock disponible et vos consignes, puis suivez vos réservations depuis votre espace.",
            "🧺 Acheteurs : choisissez votre créneau en quelques clics, réservez votre quantité et réglez directement le producteur sur place.",
            "",
            "Et ce n'est pas tout ! Cette année, le site a aussi profité de nombreuses améliorations :",
            "• Une interface rafraîchie et plus lisible",
            "• Une aide en ligne intégrée directement sur le site",
            "• Une nouvelle rubrique Actualité",
            "• Le nombre de vues sur chaque annonce et la liste de vos abonnés accessible depuis « Mes annonces »",
            "• Une durée de publication portée à 1 an (365 jours)",
            "• Une réinitialisation de mot de passe simplifiée directement sur le site",
            "",
            "Tout cela a pu voir le jour grâce à Kedalia (développé par Charles Ilieff), qui nous permet à nouveau de faire évoluer la plateforme régulièrement.",
            "",
            `📖 Tous les détails ici : ${articleUrl}`,
            "",
            "Producteurs, testez vite les créneaux sur vos annonces ! Et vous, quels produits locaux allez-vous réserver cette semaine ? 👇",
          ].join("\n"),
        },
        {
          id: "facebook-relance",
          label: "Relance J+7 pour les producteurs",
          text: [
            "👩‍🌾 Producteurs locaux : gagnez du temps sur vos ventes à la ferme ou au marché !",
            "",
            "Sur Les Choux d'à Côté, vous pouvez désormais ajouter des créneaux de retrait sur vos annonces et permettre à vos clients de réserver leurs quantités à l'avance.",
            "",
            "✅ Vous fixez votre stock disponible et une limite par personne si besoin",
            "✅ Vos clients voient immédiatement quand venir et quelles consignes suivre",
            "✅ En vente directe : le paiement se fait toujours directement avec vous sur place",
            "",
            `📘 Mode d'emploi en 2 minutes : ${helpSlotsUrl}`,
            "",
            "Publiez ou mettez à jour votre annonce dès aujourd'hui 🌱",
          ].join("\n"),
        },
      ],
      hashtags: "#LesChouxDaCote #VenteDirecte #CircuitCourt #ProducteursLocaux #MangerLocal",
    },
    {
      id: "instagram",
      channel: "Instagram",
      audience: "Consommateurs locavores et producteurs",
      angle: "Format visuel court, rythmé et facile à parcourir, avec appel à l'action vers le lien en bio / story.",
      visualIdea:
        "Carrousel 4 slides : 1) « Les Choux d'à Côté est de retour + nouveauté Réservation » sur fond vert avec photo de légumes ; 2) « Côté acheteurs : choisissez un créneau et réservez en 3 clics » ; 3) « Côté producteurs : maîtrisez vos stocks et créneaux en vente directe » ; 4) « Et aussi cette année : nouveau design, aide en ligne, annonces 1 an, vues & abonnés ».",
      variants: [
        {
          id: "instagram-carrousel",
          label: "Légende du carrousel",
          text: [
            "🥬 On est de retour… avec une grande nouveauté sur Les Choux d'à Côté !",
            "",
            "Après quelques années plus discrètes (le temps d'une reprise d'activité professionnelle classique), la plateforme reprend son élan grâce à Kedalia — et vous pouvez désormais réserver vos produits locaux directement sur créneaux !",
            "",
            "Comment ça marche ? 👇",
            "1️⃣ Le producteur ajoute ses créneaux de retrait et son stock disponible",
            "2️⃣ Vous réservez la quantité voulue en quelques clics",
            "3️⃣ Vous récupérez vos produits et réglez directement le producteur sur place — toujours en vente directe et sans intermédiaire 🤝",
            "",
            "Et sur le site cette année :",
            "✨ Une apparence rafraîchie et plus claire",
            "📚 Une aide en ligne intégrée",
            "📰 Une rubrique Actualité",
            "👀 Le suivi des vues et de vos abonnés côté producteurs",
            "📅 Des annonces valables jusqu'à 1 an",
            "",
            "👉 Lien de l'article en bio et en story pour tout découvrir !",
            "",
            "#LesChouxDaCote #VenteDirecte #CircuitCourt #ConsommerLocal #ProducteursLocaux #MangerDeSaison #AgricultureLocale #Locavore",
          ].join("\n"),
        },
      ],
      hashtags:
        "#LesChouxDaCote #VenteDirecte #CircuitCourt #ConsommerLocal #ProducteursLocaux #MangerDeSaison #AgricultureLocale #Locavore",
    },
    {
      id: "x",
      channel: "X",
      audience: "Utilisateurs, acteurs du circuit court et curieux du numérique",
      angle:
        "Deux options au choix : un message court direct, ou un fil en 3 messages pour détailler la nouveauté et la relance.",
      visualIdea:
        "Une capture d'écran épurée d'une fiche annonce montrant les créneaux de retrait et le bouton « Réserver ».",
      variants: [
        {
          id: "x-court",
          label: "Message court (1 post)",
          text: [
            "🥬 Du nouveau sur Les Choux d'à Côté !",
            "La réservation de produits locaux sur créneaux est en ligne — toujours en vente directe et sans intermédiaire.",
            "Nouveau design, aide intégrée, annonces valables 1 an… La plateforme reprend son élan grâce à Kedalia.",
            `👉 ${articleUrl}`,
            "#VenteDirecte #CircuitCourt",
          ].join("\n"),
        },
        {
          id: "x-fil",
          label: "Fil en 3 messages",
          text: [
            "1/3 🥬 Après quelques années plus calmes liées à ma reprise d'activité professionnelle, Les Choux d'à Côté reprend son évolution !",
            "Grande nouveauté du jour : la réservation de produits locaux sur créneaux de retrait est en ligne, toujours en vente directe et sans intermédiaire.",
            "",
            "2/3 Côté producteurs : création de créneaux, gestion du stock et des consignes, suivi des réservations, nombre de vues, accès aux abonnés et annonces publiées jusqu'à 1 an.",
            "Côté acheteurs : réservation en 3 clics, gestion depuis « Mes réservations », interface rafraîchie et aide intégrée.",
            "",
            "3/3 Ce redémarrage a été rendu possible par Kedalia, développé par Charles Ilieff, qui permet de faire évoluer une appli web simplement malgré un emploi du temps chargé.",
            `Tous les détails dans notre article : ${articleUrl}`,
            "#VenteDirecte #CircuitCourt #ProducteursLocaux",
          ].join("\n"),
        },
      ],
      hashtags: "#VenteDirecte #CircuitCourt #ProducteursLocaux",
    },
    {
      id: "linkedin",
      channel: "LinkedIn",
      audience: "Réseau professionnel, dirigeants, porteurs de projets et communauté tech / IA",
      angle:
        "Retour d'expérience authentique : silence de plusieurs années suite à la reprise d'une activité professionnelle classique, et renaissance concrète d'une plateforme existante grâce à l'IA agentique et à Kedalia de Charles Ilieff.",
      visualIdea:
        "Un visuel sobre côte à côte : la page d'accueil rafraîchie des Choux d'à Côté et un gros plan sur la nouvelle fonctionnalité de réservation sur créneaux.",
      variants: [
        {
          id: "linkedin-pro",
          label: "Publication LinkedIn",
          text: [
            "🌱 Cela faisait plusieurs années que je n'avais plus communiqué autour des Choux d'à Côté.",
            "",
            "La raison est simple : après l'aventure entrepreneuriale initiale, j'ai repris une activité professionnelle « classique ». Comme beaucoup de porteurs de projets dans cette situation, j'avais dû mettre les évolutions de la plateforme sur pause faute de temps et de ressources de développement.",
            "",
            "Pourtant, le besoin de rapprocher producteurs locaux et acheteurs en vente directe, sans intermédiaire, n'a jamais disparu.",
            "",
            "🚀 Cette année, quelque chose a changé la donne : l'IA agentique — et en particulier Kedalia, développé par Charles Ilieff.",
            "",
            "Concrètement, qu'est-ce que cela m'a permis de faire en parallèle de mon métier ?",
            "Reprendre un vrai produit existant en production, décrire mes besoins fonctionnels en français courant, relire les plans proposés, vérifier chaque évolution dans un aperçu avant mise en ligne… et livrer en quelques semaines ce qui aurait demandé des mois auparavant :",
            "",
            "✅ Une fonctionnalité complète de réservation sur créneaux (gestion des stocks, quantités max, consignes, suivi côté producteur et côté acheteur)",
            "✅ Un rafraîchissement complet de l'interface du site",
            "✅ Une aide en ligne intégrée et une rubrique Actualité",
            "✅ L'affichage du nombre de vues des annonces et l'accès aux abonnés",
            "✅ La durée des annonces portée à 365 jours et une réinitialisation de mot de passe intégrée",
            "",
            "Ce retour d'expérience m'a frappé sur un point : l'IA agentique ne sert pas seulement à créer des prototypes jetables. Bien encadrée, avec un outil comme Kedalia, elle permet à un fondateur non-développeur de redonner vie à une application réelle, avec des tests automatisés et une vraie exigence de qualité.",
            "",
            "Merci à Charles Ilieff pour le travail mené sur Kedalia et pour son accompagnement dans cette reprise !",
            "",
            `👉 Pour découvrir les nouveautés sur Les Choux d'à Côté : ${articleUrl}`,
            "",
            "Et vous, avez-vous un projet mis en pause que l'IA agentique pourrait vous aider à relancer ?",
            "",
            "#IAAgentique #Kedalia #Entrepreneuriat #CircuitCourt #VenteDirecte #LesChouxDaCote #ProduitNumérique",
          ].join("\n"),
        },
      ],
      hashtags: "#IAAgentique #Kedalia #Entrepreneuriat #CircuitCourt #VenteDirecte #LesChouxDaCote",
    },
  ]
}

export const buildNewsletterEmail = (baseUrl: string, unsubscribeUrl?: string): NewsletterEmail => {
  const siteUrl = normalizeBaseUrl(baseUrl)
  const articleUrl = `${siteUrl}${ARTICLE_PATH}`
  const searchUrl = `${siteUrl}/recherche`
  const publishUrl = `${siteUrl}/compte/producteur/annonce`
  const helpSlotsUrl = `${siteUrl}/aide/creneaux`
  const helpBookUrl = `${siteUrl}/aide/reserver`
  const aboutUrl = `${siteUrl}/a-propos`
  const unsubscribeLink = unsubscribeUrl || `${siteUrl}/desinscription-newsletter`

  const subject = "Du nouveau sur Les Choux d'à Côté : réservez vos produits locaux sur créneaux !"
  const preheader =
    "Les Choux d'à Côté reprend son élan : réservation sur créneaux, nouveau design, aide en ligne et annonces valables 1 an."

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f8f4;font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};line-height:1.6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f8f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;">
            <tr>
              <td style="background-color:${COLORS.green};padding:24px 28px;color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.4px;text-transform:uppercase;opacity:0.9;">Les Choux d'à Côté</p>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;font-weight:bold;color:#ffffff;">
                  Nouveau : réservez vos produits locaux sur créneaux !
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;">Bonjour,</p>
                <p style="margin:0 0 16px;">
                  Cela faisait plusieurs années que nous ne vous avions pas écrit : la reprise d'une activité
                  professionnelle classique m'avait laissé moins de temps pour faire évoluer
                  <strong>Les Choux d'à Côté</strong>.
                </p>
                <p style="margin:0 0 20px;">
                  Bonne nouvelle : la plateforme reprend vie cette année avec de nombreuses nouveautés déjà en ligne — à
                  commencer par <strong>la réservation de produits sur créneaux</strong>, toujours en vente directe et
                  sans intermédiaire.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f8f4;border-left:4px solid ${COLORS.green};border-radius:4px;margin:0 0 22px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:${COLORS.green};">La réservation sur créneaux</h2>
                      <p style="margin:0 0 8px;">
                        <strong>Côté producteurs :</strong> indiquez vos dates et horaires de retrait, votre stock
                        disponible, une quantité maximale par personne si besoin et vos consignes. Retrouvez toutes vos
                        réservations en un coup d'œil dans votre espace.
                        (<a href="${helpSlotsUrl}" style="color:${COLORS.green};">Voir le guide</a>)
                      </p>
                      <p style="margin:0;">
                        <strong>Côté acheteurs :</strong> choisissez un créneau sur l'annonce, réservez votre quantité
                        en quelques clics, modifiez ou annulez depuis « Mes réservations », puis réglez directement
                        auprès du producteur lors du retrait.
                        (<a href="${helpBookUrl}" style="color:${COLORS.green};">Comment réserver</a>)
                      </p>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:${COLORS.text};">Les autres nouveautés de l'année</h2>
                <ul style="margin:0 0 22px;padding-left:20px;">
                  <li style="margin-bottom:8px;"><strong>Une interface rafraîchie et plus lisible</strong> sur ordinateur comme sur mobile.</li>
                  <li style="margin-bottom:8px;"><strong>Une aide en ligne intégrée</strong> pour répondre rapidement à toutes vos questions.</li>
                  <li style="margin-bottom:8px;"><strong>Une rubrique Actualité</strong> dédiée aux nouveautés et au circuit court.</li>
                  <li style="margin-bottom:8px;"><strong>Plus de visibilité pour les producteurs</strong> : nombre de vues sur chaque annonce et accès direct à vos abonnés depuis « Mes annonces ».</li>
                  <li style="margin-bottom:8px;"><strong>Des annonces publiées jusqu'à 1 an (365 jours)</strong> pour éviter les republications trop fréquentes.</li>
                  <li style="margin-bottom:0;"><strong>Un mot de passe oublié simplifié</strong> directement sur le site.</li>
                </ul>

                <p style="margin:0 0 24px;">
                  Cette relance a été rendue possible grâce à
                  <a href="https://kedalia.com" style="color:${COLORS.green};">Kedalia</a>, développé par Charles Ilieff,
                  qui nous permet à nouveau de faire évoluer la plateforme régulièrement
                  (<a href="${aboutUrl}" style="color:${COLORS.green};">en savoir plus</a>).
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="padding-right:12px;padding-bottom:8px;">
                      <a href="${articleUrl}" style="display:inline-block;background-color:${COLORS.green};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:4px;">
                        Lire l'article complet
                      </a>
                    </td>
                    <td style="padding-bottom:8px;">
                      <a href="${searchUrl}" style="display:inline-block;background-color:#ffffff;color:${COLORS.green};text-decoration:none;font-weight:bold;padding:11px 17px;border:1px solid ${COLORS.green};border-radius:4px;">
                        Voir les produits près de chez moi
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 16px;">
                  Vous êtes producteur ?
                  <a href="${publishUrl}" style="color:${COLORS.green};font-weight:bold;">Publiez ou mettez à jour une annonce avec vos créneaux de retrait.</a>
                </p>

                <p style="margin:0;">À très bientôt sur Les Choux d'à Côté,<br /><strong>Anthony Nguyen</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f7f7f7;padding:16px 28px;font-size:12px;color:${COLORS.muted};border-top:1px solid ${COLORS.border};">
                <p style="margin:0 0 8px;">
                  Les Choux d'à Côté — La plateforme de vente directe de produits locaux.<br />
                  Une question ou une remarque ? Écrivez-nous à
                  <a href="mailto:${CONTACT_EMAIL}" style="color:${COLORS.muted};">${CONTACT_EMAIL}</a>.
                </p>
                <p style="margin:0;">
                  Vous ne souhaitez plus recevoir nos actualités par e-mail ?
                  <a href="${unsubscribeLink}" style="color:${COLORS.muted};text-decoration:underline;">Se désinscrire</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    "Bonjour,",
    "",
    "Cela faisait plusieurs années que nous ne vous avions pas écrit : la reprise d'une activité professionnelle classique m'avait laissé moins de temps pour faire évoluer Les Choux d'à Côté.",
    "",
    "Bonne nouvelle : la plateforme reprend vie cette année avec de nombreuses nouveautés déjà en ligne — à commencer par la réservation de produits sur créneaux, toujours en vente directe et sans intermédiaire.",
    "",
    "=== LA RÉSERVATION SUR CRÉNEAUX ===",
    "- Côté producteurs : indiquez vos dates et horaires de retrait, votre stock disponible, une quantité maximale par personne si besoin et vos consignes. Retrouvez toutes vos réservations en un coup d'œil dans votre espace.",
    `  Guide créneaux : ${helpSlotsUrl}`,
    "- Côté acheteurs : choisissez un créneau sur l'annonce, réservez votre quantité en quelques clics, modifiez ou annulez depuis « Mes réservations », puis réglez directement auprès du producteur lors du retrait.",
    `  Comment réserver : ${helpBookUrl}`,
    "",
    "=== LES AUTRES NOUVEAUTÉS DE L'ANNÉE ===",
    "- Une interface rafraîchie et plus lisible sur ordinateur comme sur mobile",
    "- Une aide en ligne intégrée pour répondre rapidement à toutes vos questions",
    "- Une rubrique Actualité dédiée aux nouveautés et au circuit court",
    "- Plus de visibilité pour les producteurs : nombre de vues sur chaque annonce et accès direct à vos abonnés depuis « Mes annonces »",
    "- Des annonces publiées jusqu'à 1 an (365 jours)",
    "- Un mot de passe oublié simplifié directement sur le site",
    "",
    `Cette relance a été rendue possible grâce à Kedalia (https://kedalia.com), développé par Charles Ilieff. En savoir plus : ${aboutUrl}`,
    "",
    `Lire l'article complet : ${articleUrl}`,
    `Voir les produits près de chez vous : ${searchUrl}`,
    `Producteurs — publier ou mettre à jour une annonce : ${publishUrl}`,
    "",
    "À très bientôt sur Les Choux d'à Côté,",
    "Anthony Nguyen",
    `Contact : ${CONTACT_EMAIL}`,
    "",
    `Se désinscrire des actualités : ${unsubscribeLink}`,
  ].join("\n")

  return { subject, preheader, html, text }
}
