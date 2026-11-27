import styled from "@emotion/styled"
import { transparentize } from "polished"
import { useEffect, useRef, useState } from "react"
import { Button } from "src/components/Button"
import { COLORS, RADIUS, SIZES } from "src/constants"
import type { SocialVisual as SocialVisualData } from "src/constants/communication"
import { VISUAL_LOGO_PATH, VISUAL_PHOTO_PATH, VISUAL_SITE_LABEL } from "src/constants/communication"

const FONT_FAMILY = "Nunito"
const PALE_GREEN = "#EEF6EF"

const Figure = styled.figure`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  canvas {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid ${COLORS.border};
    border-radius: ${RADIUS}px;
    background-color: ${COLORS.odd};
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: ${SIZES.small}px;
    color: ${COLORS.muted};
  }
`

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Image introuvable : ${src}`))
    image.src = src
  })

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_FAMILY}, sans-serif`

// Découpe un texte en lignes qui tiennent dans la largeur donnée, avec la police déjà choisie sur le contexte
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  let current = ""
  for (const word of text.split(" ")) {
    const candidate = current ? `${current} ${word}` : word
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) {
    lines.push(current)
  }
  return lines
}

// Photo recadrée pour couvrir toute l'image, sans déformation
const drawCover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

interface TextBlock {
  text: string
  weight: number
  size: number
  color: string
  gapBefore: number
}

const drawVisual = (
  ctx: CanvasRenderingContext2D,
  visual: SocialVisualData,
  photo: HTMLImageElement | null,
  logo: HTMLImageElement | null,
) => {
  const { width, height } = visual
  const isPhoto = visual.variant === "photo"
  // Unité de mesure proportionnelle au plus petit côté : le même rendu sur tous les formats
  const unit = Math.min(width, height) / 100
  const margin = 7 * unit
  const textWidth = width - 2 * margin

  ctx.clearRect(0, 0, width, height)
  if (isPhoto && photo) {
    drawCover(ctx, photo, width, height)
    ctx.fillStyle = transparentize(0.22, COLORS.green)
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.fillStyle = isPhoto ? COLORS.green : PALE_GREEN
    ctx.fillRect(0, 0, width, height)
    if (!isPhoto) {
      ctx.fillStyle = COLORS.green
      ctx.fillRect(0, 0, width, 2 * unit)
    }
  }

  const mainColor = isPhoto ? COLORS.white : COLORS.green
  const secondColor = isPhoto ? COLORS.white : COLORS.text

  // Bandeau du bas : logo et adresse du site sur une pastille blanche
  const footerHeight = 11 * unit
  const footerY = height - margin - footerHeight
  const logoHeight = 5.5 * unit
  const logoWidth = logo ? (logo.naturalWidth / logo.naturalHeight) * logoHeight : 0
  ctx.font = font(700, 3.6 * unit)
  const labelWidth = ctx.measureText(VISUAL_SITE_LABEL).width
  const padding = 3 * unit
  const pillWidth = padding * 2 + logoWidth + (logo ? 3 * unit : 0) + labelWidth
  ctx.fillStyle = COLORS.white
  roundedRect(ctx, margin, footerY, pillWidth, footerHeight, footerHeight / 2)
  ctx.fill()
  if (logo) {
    ctx.drawImage(logo, margin + padding, footerY + (footerHeight - logoHeight) / 2, logoWidth, logoHeight)
  }
  ctx.fillStyle = COLORS.green
  ctx.textBaseline = "middle"
  ctx.fillText(VISUAL_SITE_LABEL, margin + pillWidth - padding - labelWidth, footerY + footerHeight / 2)

  // Textes, centrés verticalement dans l'espace au-dessus du bandeau
  const blocks: TextBlock[] = [{ text: visual.title, weight: 700, size: 9 * unit, color: mainColor, gapBefore: 0 }]
  if (visual.subtitle) {
    blocks.push({ text: visual.subtitle, weight: 500, size: 6 * unit, color: secondColor, gapBefore: 4 * unit })
  }
  visual.lines?.forEach((line, index) => {
    blocks.push({
      text: `•  ${line}`,
      weight: 500,
      size: 6 * unit,
      color: secondColor,
      gapBefore: index === 0 ? 5 * unit : 2 * unit,
    })
  })

  const laidOut = blocks.map((block) => {
    ctx.font = font(block.weight, block.size)
    return { ...block, lines: wrapText(ctx, block.text, textWidth), lineHeight: block.size * 1.25 }
  })
  const totalHeight = laidOut.reduce((sum, block) => sum + block.gapBefore + block.lines.length * block.lineHeight, 0)
  const areaTop = margin
  const areaBottom = footerY - 3 * unit
  let y = areaTop + Math.max(0, (areaBottom - areaTop - totalHeight) / 2)

  ctx.textBaseline = "top"
  ctx.textAlign = "left"
  if (isPhoto) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)"
    ctx.shadowBlur = 1.5 * unit
  }
  laidOut.forEach((block, blockIndex) => {
    y += block.gapBefore
    ctx.font = font(block.weight, block.size)
    ctx.fillStyle = block.color
    block.lines.forEach((line) => {
      ctx.fillText(line, margin, y)
      y += block.lineHeight
    })
    // Petit trait sous le titre
    if (blockIndex === 0) {
      ctx.save()
      ctx.shadowColor = "transparent"
      ctx.fillStyle = isPhoto ? COLORS.white : COLORS.green
      ctx.fillRect(margin, y + 1.5 * unit, 12 * unit, 0.8 * unit)
      ctx.restore()
      y += 2.3 * unit
    }
  })
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
}

interface Props {
  visual: SocialVisualData
}

const SocialVisual = ({ visual }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      // Sans la police chargée, le navigateur dessinerait le texte dans une police de secours
      await Promise.all([document.fonts.load(font(700, 40)), document.fonts.load(font(500, 40))]).catch(() => undefined)
      const [photo, logo] = await Promise.all([
        visual.variant === "photo" ? loadImage(VISUAL_PHOTO_PATH).catch(() => null) : Promise.resolve(null),
        loadImage(VISUAL_LOGO_PATH).catch(() => null),
      ])
      const ctx = canvasRef.current?.getContext("2d")
      if (cancelled || !ctx) {
        return
      }
      drawVisual(ctx, visual, photo, logo)
      setReady(true)
    }
    render()
    return () => {
      cancelled = true
    }
  }, [visual])

  const handleDownload = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) {
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `leschouxdacote-${visual.fileName}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, "image/png")
  }

  return (
    <Figure>
      <canvas
        ref={canvasRef}
        width={visual.width}
        height={visual.height}
        role="img"
        aria-label={[visual.title, visual.subtitle, ...(visual.lines || [])].filter(Boolean).join(" — ")}
      />
      <figcaption>
        <span>
          {visual.label} — {visual.width} × {visual.height}
        </span>
        <Button type="button" $variant="green" disabled={!ready} onClick={handleDownload}>
          Télécharger
        </Button>
      </figcaption>
    </Figure>
  )
}

export default SocialVisual
