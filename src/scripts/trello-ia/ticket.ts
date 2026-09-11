import { createHash } from "crypto"
import { Effect } from "effect"
import { mkdirSync, rmSync, writeFileSync } from "fs"
import path from "path"
import sharp from "sharp"
import { IMAGE_FAILURE } from "./claude"
import type { WorktreePaths } from "./git"
import { log, logErr } from "./log"
import type { TicketState, TrelloCard, TrelloCardDetails, TrelloComment } from "./schemas"
import { TrelloClient } from "./trello"

export const TICKET_DIR = ".ia-ticket" // pièces jointes du ticket, téléchargées pour Claude (jamais commitées)
const TRELLO_COMMENT_LIMIT = 15000 // Trello accepte 16384 caractères par commentaire
const DISCUSSION_LIMIT = 8000 // taille max de la discussion injectée dans les prompts
const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
// côté max des captures envoyées au modèle : une capture pleine taille fait saturer le GPU du
// modèle vision (500 « CUDA out of memory »), et le repli coûte plus cher que le modèle demandé
const MAX_IMAGE_PX = 1024

export const STATUS_COMMENT = /^(📋|✅|♻️|⚠️|🌐|🛠️|🔁|🚫)/ // commentaires de statut de l'automatisation, exclus des prompts
// détection par préfixe et non par auteur : le PO peut commenter avec le compte Trello du token
export const BOT_COMMENT = /^(🤖|📋|✅|♻️|⚠️|🌐|🛠️|🔁)/
// commentaire du PO listant les pièces jointes à ne pas envoyer au modèle (« 🚫 photo.png, capture 2.png »,
// 🚫 seul = toutes) : elles ne sont pas téléchargées, donc pas de tokens vision dépensés dessus.
// Volontairement absent de BOT_COMMENT : ce commentaire vient du PO, il ne doit pas passer pour une réponse du bot.
export const IGNORE_COMMENT = /^🚫/
// ⚠️ est déjà dans STATUS_COMMENT et BOT_COMMENT : cet avertissement n'entre pas dans les prompts
// et ne fait pas répondre le cadrage
const IMAGE_WARNING =
  "⚠️ Le modèle n'a pas pu lire les images du ticket (saturation côté fournisseur) : le travail continue sans elles. Si les captures sont indispensables, relance la carte plus tard."

export interface TicketContext {
  readonly details: TrelloCardDetails
  readonly comments: ReadonlyArray<TrelloComment>
  readonly attachmentPaths: ReadonlyArray<string>
  readonly imagePaths: ReadonlyArray<string> // sous-ensemble de attachmentPaths : ce que le modèle lira comme image
}

// UUID déterministe (style v5) dérivé du numéro de ticket : une session Claude par ticket et par usage
export const uuidForTicket = (idShort: number, kind: "dev" | "chat" = "dev") => {
  const seed = kind === "dev" ? `leschouxdacote-trello-${idShort}` : `leschouxdacote-trello-${kind}-${idShort}`
  const hash = createHash("sha1").update(seed).digest("hex")
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "")

export const ticketPaths = (worktreesDir: string, card: TrelloCard): WorktreePaths => {
  const slug = slugify(card.name)
  return {
    branch: `ia/${card.idShort}-${slug}`,
    worktree: path.join(worktreesDir, `${card.idShort}-${slug}`),
  }
}

export const truncate = (text: string) =>
  text.length > TRELLO_COMMENT_LIMIT ? text.slice(0, TRELLO_COMMENT_LIMIT) + "\n…" : text

export const lastIndexWhere = <T>(items: ReadonlyArray<T>, predicate: (item: T) => boolean) => {
  for (let index = items.length - 1; index >= 0; index--) {
    if (predicate(items[index])) {
      return index
    }
  }
  return -1
}

// même normalisation des deux côtés : le nom cité par le PO subit la sanitisation appliquée au nom
// de fichier téléchargé (ticket.ts, plus bas), donc espaces, accents et casse ne comptent pas
const normalizeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^\w.-]+/g, "_")

// pièces jointes citées dans les commentaires 🚫 de la discussion ; un 🚫 sans nom les vise toutes
export const attachmentsToIgnore = (comments: ReadonlyArray<TrelloComment>) => {
  const names: string[] = []
  let all = false
  for (const comment of comments.filter((comment) => IGNORE_COMMENT.test(comment.text))) {
    const cited = comment.text.replace(IGNORE_COMMENT, "").split(/[,\n]/).map(normalizeName).filter(Boolean)
    if (cited.length === 0) {
      all = true
    }
    names.push(...cited)
  }
  return { all, names }
}

// correspondance exacte ou par préfixe : « photo3 » suffit pour « photo3.jpg »
export const isIgnored = (name: string, ignore: ReturnType<typeof attachmentsToIgnore>) =>
  ignore.all || ignore.names.some((cited) => normalizeName(name).startsWith(cited))

// réduit une capture en place (format et nom conservés) et répond « c'est une image » ; une pièce
// jointe qui n'en est pas une (PDF, zip...) fait échouer sharp et reste telle quelle. C'est le test
// d'image le plus fidèle : il échoue exactement là où l'outil Read du modèle échouerait.
const shrinkImage = (filePath: string) =>
  Effect.promise(async () => {
    try {
      const resized = await sharp(filePath)
        .resize({ width: MAX_IMAGE_PX, height: MAX_IMAGE_PX, fit: "inside", withoutEnlargement: true })
        .toBuffer()
      writeFileSync(filePath, resized)
      return true
    } catch {
      return false // rien à redimensionner : ce n'est pas une image
    }
  })

// télécharge les pièces jointes (fichiers Trello ≤ 10 Mo, 10 max) dans <dir>/.ia-ticket/<n°>, sauf celles
// écartées par un commentaire 🚫 ; une pièce jointe en échec est ignorée (log), les autres sont conservées
const fetchAttachments = (details: TrelloCardDetails, comments: ReadonlyArray<TrelloComment>, dir: string) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const ticketDir = path.join(dir, TICKET_DIR, String(details.idShort))
    rmSync(ticketDir, { recursive: true, force: true })
    const ignore = attachmentsToIgnore(comments)
    const files = details.attachments
      .filter((attachment) => attachment.bytes !== null && attachment.bytes <= MAX_ATTACHMENT_BYTES)
      // écarté avant la limite de 10 : les photos ignorées ne prennent pas la place des autres
      .filter((attachment) => {
        if (!isIgnored(attachment.name, ignore)) {
          return true
        }
        log(`  Pièce jointe « ${attachment.name} » ignorée (🚫 dans la discussion)`)
        return false
      })
      .slice(0, MAX_ATTACHMENTS)
    const paths: string[] = []
    const images: string[] = []
    if (files.length === 0) {
      return { paths, images }
    }
    mkdirSync(ticketDir, { recursive: true })
    for (const attachment of files) {
      const fileName = attachment.name.replace(/[^\w.-]+/g, "_") || attachment.id
      const destPath = path.join(ticketDir, fileName)
      yield* trello.downloadAttachment(attachment.url, destPath).pipe(
        Effect.flatMap(() => shrinkImage(destPath)),
        Effect.map((isImage) => {
          const relativePath = path.relative(dir, destPath)
          paths.push(relativePath)
          if (isImage) {
            images.push(relativePath)
          }
          log(`  Pièce jointe téléchargée : ${relativePath}${isImage ? " (image, envoyée au modèle)" : ""}`)
        }),
        Effect.catch((error) => Effect.sync(() => logErr(`  Pièce jointe « ${attachment.name} » ignorée :`, error))),
      )
    }
    return { paths, images }
  })

// contexte complet du ticket : carte détaillée, discussion et pièces jointes téléchargées dans `dir`
export const loadTicketContext = (card: TrelloCard, dir: string) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const details = yield* trello.getCardDetails(card.id)
    const comments = yield* trello.getComments(card.id)
    const { paths, images } = yield* fetchAttachments(details, comments, dir)
    const context: TicketContext = { details, comments, attachmentPaths: paths, imagePaths: images }
    return context
  })

// Sans ce bloc, le cadrage d'une carte déjà développée conclut « rien n'est implémenté » :
// il ne voit ni la branche ni la PR, et sa session est distincte de celle du dev.
export const devStateBlock = (state?: TicketState) => {
  if (!state?.branch) {
    return ""
  }
  const refs = [`branche ${state.branch}`]
  if (state.prUrl) {
    refs.push(`PR ${state.prUrl}`)
  }
  if (state.status) {
    refs.push(`statut ${state.status}`)
  }
  return `Ce ticket a DÉJÀ été développé (${refs.join(", ")}).
Le dépôt de cette discussion est positionné sur cette branche : le code que tu lis INCLUT ce travail.
Ne conclus donc pas que rien n'est implémenté — vérifie l'état réel avant de répondre au PO.`
}

const formatDiscussion = (comments: ReadonlyArray<TrelloComment>) => {
  const lines = comments
    .filter((comment) => !STATUS_COMMENT.test(comment.text))
    .map((comment) => `[${BOT_COMMENT.test(comment.text) ? "IA" : comment.memberName}] ${comment.text}`)
  const text = lines.join("\n---\n")
  return text.length > DISCUSSION_LIMIT ? `…${text.slice(-DISCUSSION_LIMIT)}` : text
}

export const ticketContextBlock = (context: TicketContext) => {
  const { details, comments, attachmentPaths } = context
  const parts = [
    `Ticket Trello #${details.idShort} — ${details.name}`,
    details.shortUrl,
    `\nDescription :\n${details.desc || "(pas de description)"}`,
  ]
  const labels = details.labels.map((label) => label.name).filter(Boolean)
  if (labels.length > 0) {
    parts.push(`\nLabels : ${labels.join(", ")}`)
  }
  if (details.due) {
    parts.push(`Échéance : ${details.due}`)
  }
  if (details.members.length > 0) {
    parts.push(`Membres : ${details.members.map((member) => member.fullName || member.username).join(", ")}`)
  }
  for (const checklist of details.checklists) {
    const items = checklist.checkItems.map((item) => `- [${item.state === "complete" ? "x" : " "}] ${item.name}`)
    parts.push(`\nChecklist « ${checklist.name} » :\n${items.join("\n")}`)
  }
  if (attachmentPaths.length > 0) {
    parts.push(
      `\nPièces jointes du ticket, téléchargées localement (consulte-les) :\n${attachmentPaths.map((p) => `- ${p}`).join("\n")}`,
    )
  }
  const discussion = formatDiscussion(comments)
  if (discussion) {
    parts.push(`\nDiscussion sur le ticket (du plus ancien au plus récent) :\n${discussion}`)
  }
  return parts.join("\n")
}

// l'upstream a saturé sur les images et le ticket en a : le texte seul, lui, passe
export const isImageFailure = (error: { readonly message: string }, context: TicketContext) =>
  context.imagePaths.length > 0 && IMAGE_FAILURE.test(error.message)

// même contexte sans les images (les PDF et autres pièces jointes restent)
export const withoutImages = (context: TicketContext): TicketContext => ({
  ...context,
  attachmentPaths: context.attachmentPaths.filter((attachmentPath) => !context.imagePaths.includes(attachmentPath)),
  imagePaths: [],
})

// repli quand le modèle ne peut pas lire les images : elles sont effacées du worktree (les prompts ne
// les citent plus, mais Read et Glob restent autorisés), le PO est prévenu, et l'appelant reconstruit
// sa demande sur le bloc renvoyé — dans une session NEUVE : une reprise rejouerait l'image depuis le
// transcript de la session et échouerait à l'identique.
export const dropImages = (card: TrelloCard, context: TicketContext, dir: string) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    log(`  Images illisibles par le modèle : ${context.imagePaths.length} ignorée(s), nouvelle tentative sans elles`)
    for (const imagePath of context.imagePaths) {
      rmSync(path.join(dir, imagePath), { force: true })
    }
    yield* trello.addComment(card.id, IMAGE_WARNING)
    return ticketContextBlock(withoutImages(context))
  })
