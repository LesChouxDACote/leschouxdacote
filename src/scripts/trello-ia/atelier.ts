// Cadrage (« Atelier IA ») : discussion sur la carte, sans toucher au code
import { Cause, Effect } from "effect"
import { CHAT_TIMEOUT, claudeArgsFor, ClaudeRunner } from "./claude"
import { Git } from "./git"
import type { ResolvedLists } from "./lists"
import { initialAnalysisPrompt, replyPrompt } from "./prompts"
import type { TrelloCard } from "./schemas"
import { StateStore } from "./state"
import {
  BOT_COMMENT,
  lastIndexWhere,
  loadTicketContext,
  STATUS_COMMENT,
  ticketContextBlock,
  truncate,
  uuidForTicket,
} from "./ticket"
import { TrelloClient } from "./trello"

// cadrage : lecture seule garantie par le mode plan
const CHAT_ARGS = ["--output-format", "json", "--permission-mode", "plan"]

const processDiscussion = (card: TrelloCard) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const git = yield* Git
    const claude = yield* ClaudeRunner
    const store = yield* StateStore

    const comments = yield* trello.getComments(card.id)
    const lastComment = comments[comments.length - 1]
    if (lastComment && BOT_COMMENT.test(lastComment.text)) {
      console.log(`💬 #${card.idShort} « ${card.name} » : en attente d'une réponse du PO`)
      return // dernier mot au bot : on attend la réponse du PO
    }

    console.log(
      `\n💬 Cadrage du ticket #${card.idShort} « ${card.name} » (${comments.length} commentaire(s), dernier : ${lastComment ? lastComment.memberName : "aucun"})`,
    )
    yield* git.refreshAtelierWorktree
    const context = yield* loadTicketContext(card, git.atelierWorktree)
    const claudeArgs = claudeArgsFor(context.details)
    const state = (yield* store.read)[card.idShort]
    const chatSessionId = state?.chatSessionId
    const initialArgs = ["-p", initialAnalysisPrompt(ticketContextBlock(context)), ...CHAT_ARGS, ...claudeArgs]

    const output = chatSessionId
      ? yield* Effect.gen(function* () {
          const lastBotIndex = lastIndexWhere(comments, (comment) => BOT_COMMENT.test(comment.text))
          const newMessages =
            comments
              .slice(lastBotIndex + 1)
              .filter((comment) => !STATUS_COMMENT.test(comment.text))
              .map((comment) => `[${comment.memberName}] ${comment.text}`)
              .join("\n---\n") || "(carte relancée sans nouveau message)"
          console.log(`  Reprise de la session de cadrage ${chatSessionId}…`)
          return yield* claude
            .run(
              ["-p", "--resume", chatSessionId, replyPrompt(newMessages), ...CHAT_ARGS, ...claudeArgs],
              git.atelierWorktree,
              CHAT_TIMEOUT,
            )
            .pipe(
              Effect.catch((error) =>
                Effect.sync(() => console.error("  Reprise du cadrage impossible, nouvelle session :", error)).pipe(
                  Effect.andThen(claude.run(initialArgs, git.atelierWorktree, CHAT_TIMEOUT)),
                ),
              ),
            )
        })
      : yield* Effect.gen(function* () {
          console.log("  Analyse initiale du besoin…")
          return yield* claude.runNewSession(
            initialArgs,
            uuidForTicket(card.idShort, "chat"),
            git.atelierWorktree,
            CHAT_TIMEOUT,
          )
        })

    yield* store.save(card.idShort, { chatSessionId: output.session_id })
    yield* trello.addComment(card.id, truncate(`🤖 ${output.result}`))
  })

// une passe sur la liste de cadrage : chaque carte est traitée indépendamment (une erreur n'arrête pas les autres)
export const processDiscussions = (lists: ResolvedLists) =>
  Effect.gen(function* () {
    if (!lists.refine) {
      return
    }
    const trello = yield* TrelloClient
    const cards = yield* trello.getCards(lists.refine.id)
    if (cards.length > 0) {
      console.log(`\nAtelier : ${cards.length} carte(s) dans « ${lists.refine.name} »`)
    }
    for (const card of cards) {
      yield* processDiscussion(card).pipe(
        Effect.catchCause((cause) =>
          Effect.sync(() => console.error(`Cadrage du ticket #${card.idShort} :`, Cause.squash(cause))),
        ),
      )
    }
  })
