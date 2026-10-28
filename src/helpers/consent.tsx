import { createContext, useContext, useEffect, useState } from "react"
import { disableAnalytics, enableAnalytics } from "src/helpers/firebase"

// Consentement à la mesure d'audience (Google Analytics), cf. charte partie 4 : choix conservé 13 mois au maximum.

type ConsentChoice = "accepted" | "refused"

interface StoredConsent {
  choice: ConsentChoice
  date: number
}

interface IConsentContext {
  // undefined : pas encore lu (rendu serveur, premier rendu client) ; null : aucun choix valide
  choice: ConsentChoice | null | undefined
  accept: () => void
  refuse: () => void
  reset: () => void
}

const STORAGE_KEY = "cookie-consent"
const MAX_AGE_MONTHS = 13

const ConsentContext = createContext<IConsentContext>({
  choice: undefined,
  accept: () => {
    // we are outside of the context: do nothing
  },
  refuse: () => {
    // we are outside of the context: do nothing
  },
  reset: () => {
    // we are outside of the context: do nothing
  },
})

const readConsent = (): ConsentChoice | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as StoredConsent | null
    if (!stored || (stored.choice !== "accepted" && stored.choice !== "refused")) {
      return null
    }
    const expiry = new Date(stored.date)
    expiry.setMonth(expiry.getMonth() + MAX_AGE_MONTHS)
    return expiry.getTime() > Date.now() ? stored.choice : null
  } catch {
    return null
  }
}

const saveConsent = (choice: ConsentChoice) => {
  const stored: StoredConsent = { choice, date: Date.now() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // stockage indisponible (navigation privée stricte…) : le choix vaut pour la visite en cours
  }
}

export const ConsentProvider = ({ children }: { children: React.ReactNode }) => {
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined)

  useEffect(() => {
    // lecture côté client uniquement : pas d'écart entre le rendu serveur et l'hydratation
    setChoice(readConsent())
  }, [])

  useEffect(() => {
    if (choice === "accepted") {
      enableAnalytics()
    }
  }, [choice])

  const accept = () => {
    saveConsent("accepted")
    setChoice("accepted")
  }

  const refuse = () => {
    saveConsent("refused")
    setChoice("refused")
    disableAnalytics()
  }

  const reset = () => {
    setChoice(null)
  }

  return <ConsentContext.Provider value={{ choice, accept, refuse, reset }}>{children}</ConsentContext.Provider>
}

export const useConsent = () => useContext(ConsentContext)
