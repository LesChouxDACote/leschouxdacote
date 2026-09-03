import { Schema as Sc } from "effect"

// --- Trello (réponses de l'API, clés inconnues ignorées) ---

export const TrelloList = Sc.Struct({ id: Sc.String, name: Sc.String })
export type TrelloList = typeof TrelloList.Type

export const TrelloCard = Sc.Struct({
  id: Sc.String,
  idShort: Sc.Number,
  name: Sc.String,
  desc: Sc.String,
  shortUrl: Sc.String,
})
export type TrelloCard = typeof TrelloCard.Type

export const TrelloMember = Sc.Struct({
  id: Sc.String,
  username: Sc.String,
  fullName: Sc.optional(Sc.NullOr(Sc.String)),
})
export type TrelloMember = typeof TrelloMember.Type

export const TrelloCommentAction = Sc.Struct({
  id: Sc.String,
  date: Sc.String,
  idMemberCreator: Sc.String,
  memberCreator: Sc.optional(
    Sc.Struct({ fullName: Sc.optional(Sc.NullOr(Sc.String)), username: Sc.optional(Sc.NullOr(Sc.String)) }),
  ),
  data: Sc.Struct({ text: Sc.String }),
})

export interface TrelloComment {
  readonly id: string
  readonly date: string
  readonly memberId: string
  readonly memberName: string
  readonly text: string
}

export const TrelloChecklistItem = Sc.Struct({ name: Sc.String, state: Sc.Literals(["complete", "incomplete"]) })
export type TrelloChecklistItem = typeof TrelloChecklistItem.Type

export const TrelloChecklist = Sc.Struct({ name: Sc.String, checkItems: Sc.Array(TrelloChecklistItem) })
export type TrelloChecklist = typeof TrelloChecklist.Type

export const TrelloAttachment = Sc.Struct({
  id: Sc.String,
  name: Sc.String,
  url: Sc.String,
  bytes: Sc.NullOr(Sc.Number), // null pour les liens, renseigné pour les fichiers uploadés sur Trello
  mimeType: Sc.optional(Sc.NullOr(Sc.String)),
})
export type TrelloAttachment = typeof TrelloAttachment.Type

export const TrelloCardDetails = Sc.Struct({
  ...TrelloCard.fields,
  due: Sc.optional(Sc.NullOr(Sc.String)),
  labels: Sc.Array(Sc.Struct({ name: Sc.String, color: Sc.optional(Sc.NullOr(Sc.String)) })),
  checklists: Sc.Array(TrelloChecklist),
  attachments: Sc.Array(TrelloAttachment),
  members: Sc.Array(Sc.Struct({ username: Sc.String, fullName: Sc.optional(Sc.NullOr(Sc.String)) })),
})
export type TrelloCardDetails = typeof TrelloCardDetails.Type

// --- Claude (sortie JSON de `claude -p --output-format json`) ---

export const ClaudeOutput = Sc.Struct({
  result: Sc.String,
  session_id: Sc.String,
  is_error: Sc.optional(Sc.Boolean),
  modelUsage: Sc.optional(Sc.Record(Sc.String, Sc.Unknown)), // clés = identifiants des modèles utilisés
})
export type ClaudeOutput = typeof ClaudeOutput.Type

// --- État des tickets (.ia-sessions.json) : format inchangé, tous champs optionnels ---

export const TicketStatus = Sc.Literals(["plan", "implement", "done", "failed"])
export type TicketStatus = typeof TicketStatus.Type

export const TicketState = Sc.Struct({
  sessionId: Sc.optional(Sc.String), // session de développement (plan + implémentation)
  chatSessionId: Sc.optional(Sc.String), // session de cadrage (Atelier IA)
  branch: Sc.optional(Sc.String),
  status: Sc.optional(TicketStatus),
  prUrl: Sc.optional(Sc.String),
})
export type TicketState = typeof TicketState.Type

export const StateFile = Sc.Record(Sc.String, TicketState)
export type StateFile = typeof StateFile.Type
