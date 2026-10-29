import { useRouter } from "next/router"
import { useCallback, useEffect, useRef, useState } from "react"

export interface PendingNavigation {
  url: string
  type: "push" | "pop"
}

interface UnsavedChangesOptions {
  isDirty: boolean
}

// Volontairement explicite : ce message ressort en console quand une navigation est annulée (cf. commentaire ci-dessous).
const ABORT_MESSAGE = "Navigation annulée : modifications non enregistrées"

// Garde-fou de sortie de page : modale maison pour la navigation interne, restauration d'URL + modale pour le bouton
// retour du navigateur, alerte native pour refresh/fermeture d'onglet. À utiliser sur une seule page montée à la fois.
export const useUnsavedChanges = ({ isDirty }: UnsavedChangesOptions) => {
  const router = useRouter()
  const [pending, setPending] = useState<PendingNavigation | null>(null)

  const isDirtyRef = useRef(isDirty)
  const allowNextRef = useRef(false)
  // Snapshot de l'état history de Next, pour restaurer l'URL après un retour navigateur bloqué
  const historyStateRef = useRef<unknown>(null)

  isDirtyRef.current = isDirty

  useEffect(() => {
    if (isDirty && window.history.state) {
      historyStateRef.current = window.history.state
    }
  }, [isDirty])

  // Autorise la prochaine navigation (redirection après « Valider », bouton « Quitter sans enregistrer »)
  const allowNext = useCallback(() => {
    allowNextRef.current = true
  }, [])

  const stay = useCallback(() => {
    setPending(null)
  }, [])

  const leave = useCallback(() => {
    setPending(null)
    allowNextRef.current = true
    if (pending?.type === "pop") {
      router.back()
    } else if (pending) {
      router.push(pending.url)
    }
  }, [pending, router])

  useEffect(() => {
    // Navigation interne : Next 12 n'a pas d'API d'annulation, le pattern documenté est d'émettre routeChangeError
    // (referme la barre de progression de Nprogress) puis de throw pour interrompre le changement de page.
    const onRouteChangeStart = (url: string) => {
      if (!isDirtyRef.current || allowNextRef.current) {
        allowNextRef.current = false
        return
      }

      setPending({ url, type: "push" })
      router.events.emit("routeChangeError", new Error(ABORT_MESSAGE), url)
      throw new Error(ABORT_MESSAGE)
    }

    // Refresh / fermeture d'onglet : alerte native (le texte est imposé par le navigateur)
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) {
        return
      }
      event.preventDefault()
      event.returnValue = ""
    }

    // Le throw ci-dessus sort en rejet de promesse non géré côté Next (link.js) : on neutralise ce bruit attendu
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message === ABORT_MESSAGE) {
        event.preventDefault()
      }
    }

    // Bouton retour : l'URL a déjà changé quand beforePopState est appelé, on la restaure avant d'afficher la modale
    router.beforePopState(({ as, url }) => {
      if (!isDirtyRef.current || allowNextRef.current) {
        return true
      }
      window.history.pushState(historyStateRef.current, "", router.asPath)
      setPending({ url: as || url, type: "pop" })
      return false
    })

    router.events.on("routeChangeStart", onRouteChangeStart)
    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("unhandledrejection", onUnhandledRejection)

    return () => {
      router.events.off("routeChangeStart", onRouteChangeStart)
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      router.beforePopState(() => true)
    }
  }, [router])

  return { pending, stay, leave, allowNext }
}

export default useUnsavedChanges
