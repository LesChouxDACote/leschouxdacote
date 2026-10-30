// Sujets de l'aide en ligne (/aide) : chaque slug est une page de src/pages/aide.
// Les mots-clés servent au champ de recherche de l'accueil de l'aide.

export type HelpGroup = "tous" | "producteurs" | "souci"

export interface HelpTopic {
  slug: string
  title: string
  group: HelpGroup
  keywords: string[]
}

export const HELP_GROUPS: Record<HelpGroup, string> = {
  tous: "Pour tous",
  producteurs: "Pour les producteurs",
  souci: "En cas de souci",
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: "creer-son-compte",
    title: "Créer son compte et se connecter",
    group: "tous",
    keywords: ["inscription", "compte", "connexion", "mot de passe", "SIRET", "acheteur", "producteur"],
  },
  {
    slug: "favoris-et-alertes",
    title: "Gérer ses favoris et ses alertes",
    group: "tous",
    keywords: ["favori", "suivre", "alerte", "e-mail", "notification", "expiration"],
  },
  {
    slug: "reserver",
    title: "Réserver un produit",
    group: "tous",
    keywords: ["réservation", "réserver", "créneau", "quantité", "retrait", "paiement"],
  },
  {
    slug: "mes-reservations",
    title: "Gérer ses réservations",
    group: "tous",
    keywords: ["réservation", "modifier", "annuler", "quantité", "acheteur"],
  },
  {
    slug: "publier-une-annonce",
    title: "Publier une annonce",
    group: "producteurs",
    keywords: ["annonce", "publier", "photo", "prix", "adresse", "conseils", "durée"],
  },
  {
    slug: "modifier-une-annonce",
    title: "Modifier ou republier une annonce",
    group: "producteurs",
    keywords: ["annonce", "modifier", "republier", "désactiver", "supprimer", "jours", "expirée"],
  },
  {
    slug: "creneaux",
    title: "Créer des créneaux de retrait",
    group: "producteurs",
    keywords: ["créneau", "retrait", "stock", "réservation", "consignes", "horaire"],
  },
  {
    slug: "reservations-clients",
    title: "Suivre les réservations de ses clients",
    group: "producteurs",
    keywords: ["réservation", "client", "créneau", "quantité", "stock"],
  },
  {
    slug: "erreurs-frequentes",
    title: "Les erreurs les plus fréquentes",
    group: "souci",
    keywords: ["erreur", "message", "SIRET", "adresse", "créneau", "bloqué", "problème"],
  },
  {
    slug: "faq",
    title: "Foire aux questions",
    group: "souci",
    keywords: ["FAQ", "question", "livraison", "paiement", "gratuit", "compte", "annuler"],
  },
]

export const getHelpHref = (slug: string) => `/aide/${slug}`

// Recherche insensible à la casse et aux accents (« creneau » trouve « Créneaux »)
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

export const searchHelpTopics = (query: string) => {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return HELP_TOPICS
  }
  return HELP_TOPICS.filter((topic) => {
    const haystack = normalize([topic.title, ...topic.keywords].join(" "))
    return words.every((word) => haystack.includes(word))
  })
}
