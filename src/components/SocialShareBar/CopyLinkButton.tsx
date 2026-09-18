import CopiedIcon from "@mui/icons-material/Check"
import CopyIcon from "@mui/icons-material/ContentCopy"
import { useState } from "react"
import { ShareButton } from "./ShareButton"

const fallbackCopy = (text: string) => {
  // fallback navigateurs anciens (document.execCommand est déprécié mais reste la seule option)
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed" // hors écran pour ne pas scroller
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

export const CopyLinkButton = ({ url }: { url: string }) => {
  const [isCopied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      fallbackCopy(url)
    }
    setCopied(true)
  }

  return (
    <ShareButton title={isCopied ? "Copié !" : "Copier le lien"} onClick={copy}>
      {isCopied ? <CopiedIcon /> : <CopyIcon />}
    </ShareButton>
  )
}
