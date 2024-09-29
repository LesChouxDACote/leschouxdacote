import { createContext, useContext, useState } from "react"

interface IHoverContext {
  productId: string | null
  setProduct: (product: string | null) => void
}

const HoverContext = createContext<IHoverContext>({
  productId: null,
  setProduct: () => {
    // we are outside of the context: do nothing
  },
})

export const HoverProvider = ({ children }: { children: React.ReactNode }) => {
  const [productId, setProduct] = useState<string | null>(null)
  return <HoverContext.Provider value={{ productId, setProduct }}>{children}</HoverContext.Provider>
}

export const useHover = () => useContext(HoverContext)
