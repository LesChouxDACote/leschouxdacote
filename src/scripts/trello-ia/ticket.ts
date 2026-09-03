import { createHash } from "crypto"
import { Effect } from "effect"
import { mkdirSync, rmSync } from "fs"
import path from "path"
import type { WorktreePaths } from "./git"
import type { TrelloCard, TrelloCardDetails, TrelloComment } from "./schemas"
import { TrelloClient } from "./trello"

export const TICKET_DIR = ".ia-ticket" // pièces jointes du ticket, téléchargées pour Claude (jamais commitées)
const TRELLO_COMMENT_LIMIT = 15000 // Trello accepte 16384 caractères par commentaire
const DISCUSSION_LIMIT = 8000 // taille max de la discussion injectée dans les prompts
const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export const STATUS_COMMENT = /^(📋|✅|♻️|⚠️|🌐|🛠️|🔁)/ // commentaires de statut de l'automatisation, exclus des prompts
// détection par préfixe et non par auteur : le PO peut commenter avec le compte Trello du token
export const BOT_COMMENT = /^(🤖|📋|✅|♻️|⚠️|🌐|🛠️|🔁)/

export interface TicketContext {
  readonly details: TrelloCardDetails
  readonly comments: ReadonlyArray<TrelloComment>
  readonly attachmentPaths: ReadonlyArray<string>
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

// télécharge les pièces jointes (fichiers Trello ≤ 10 Mo, 10 max) dans <dir>/.ia-ticket/<n°> ;
// une pièce jointe en échec est ignorée (log), les autres sont conservées
const fetchAttachments = (details: TrelloCardDetails, dir: string) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const ticketDir = path.join(dir, TICKET_DIR, String(details.idShort))
    rmSync(ticketDir, { recursive: true, force: true })
    const files = details.attachments
      .filter((attachment) => attachment.bytes !== null && attachment.bytes <= MAX_ATTACHMENT_BYTES)
      .slice(0, MAX_ATTACHMENTS)
    const paths: string[] = []
    if (files.length === 0) {
      return paths
    }
    mkdirSync(ticketDir, { recursive: true })
    for (const attachment of files) {
      const fileName = attachment.name.replace(/[^\w.-]+/g, "_") || attachment.id
      const destPath = path.join(ticketDir, fileName)
      yield* trello.downloadAttachment(attachment.url, destPath).pipe(
        Effect.map(() => {
          paths.push(path.relative(dir, destPath))
          console.log(`  Pièce jointe téléchargée : ${path.relative(dir, destPath)}`)
        }),
        Effect.catch((error) =>
          Effect.sync(() => console.error(`  Pièce jointe « ${attachment.name} » ignorée :`, error)),
        ),
      )
    }
    return paths
  })

// contexte complet du ticket : carte détaillée, discussion et pièces jointes téléchargées dans `dir`
export const loadTicketContext = (card: TrelloCard, dir: string) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const details = yield* trello.getCardDetails(card.id)
    const comments = yield* trello.getComments(card.id)
    const attachmentPaths = yield* fetchAttachments(details, dir)
    const context: TicketContext = { details, comments, attachmentPaths }
    return context
  })

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
