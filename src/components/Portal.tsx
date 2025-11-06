import { MutableRefObject, ReactNode, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

const usePortal = (): HTMLDivElement => {
  const container = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement>

  if (!container.current) {
    container.current = document.createElement("div")
  }

  useEffect(() => {
    const portal = document.getElementById("portal")

    if (!portal) {
      return
    }

    portal.appendChild(container.current)

    return () => {
      container.current.remove()
    }
  }, [container])

  return container.current
}

const Portal = ({ children }: { children: ReactNode }) => {
  const target = usePortal()
  return createPortal(children, target)
}

export default Portal
