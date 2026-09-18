// Cadrage (« Atelier IA ») : discussion sur la carte, sans toucher au code
import { Cause, Effect } from "effect"
import { CHAT_TIMEOUT, claudeArgsFor, ClaudeRunner } from "./claude"
import { Git } from "./git"
import type { ResolvedLists } from "./lists"
import { log, logErr } from "./log"
import { initialAnalysisPrompt, replyPrompt } from "./prompts"
import type { TrelloCard } from "./schemas"
import { StateStore } from "./state"
import {
  BOT_COMMENT,
  devStateBlock,
  dropImages,
  IGNORE_COMMENT,
  isImageFailure,
  lastIndexWhere,
  loadTicketContext,
  STATUS_COMMENT,
  type TicketContext,
  ticketContextBlock,
  truncate,
  uuidForTicket,
} from "./ticket"
import { TrelloClient } from "./trello"

// cadrage : lecture seule garantie par le mode plan
const CHAT_ARGS = ["--output-format", "json", "--permission-mode", "plan"]

// même analyse initiale, sans les images que le modèle n'a pas pu lire ; à lancer en session neuve
const analysisWithoutImages = (
  card: TrelloCard,
  context: TicketContext,
  dir: string,
  devState: string,
  claudeArgs: ReadonlyArray<string>,
) =>
  Effect.map(dropImages(card, context, dir), (block) => [
    "-p",
    initialAnalysisPrompt(block, devState),
    ...CHAT_ARGS,
    ...claudeArgs,
  ])

const processDiscussion = (card: TrelloCard) =>
  Effect.gen(function* () {
    const trello = yield* TrelloClient
    const git = yield* Git
    const claude = yield* ClaudeRunner
    const store = yield* StateStore

    // les notes 🚫 (pièces jointes à écarter) ne sont pas des messages de la discussion :
    // sans ce filtre, l'une d'elles déclencherait un tour de cadrage pour rien
    const comments = (yield* trello.getComments(card.id)).filter((comment) => !IGNORE_COMMENT.test(comment.text))
    const lastComment = comments[comments.length - 1]
    if (lastComment && BOT_COMMENT.test(lastComment.text)) {
      return // dernier mot au bot : on attend la réponse du PO, rien à logger tant que rien ne bouge
    }

    log(
      `\n💬 Cadrage du ticket #${card.idShort} « ${card.name} » (${comments.length} commentaire(s), dernier : ${lastComment ? lastComment.memberName : "aucun"})`,
    )
    // l'état est lu avant le worktree : le cadrage doit voir la branche du ticket, pas la base
    const state = (yield* store.read)[card.idShort]
    yield* git.refreshAtelierWorktree(state?.branch)
    const context = yield* loadTicketContext(card, git.atelierWorktree)
    const claudeArgs = claudeArgsFor(context.details)
    const chatSessionId = state?.chatSessionId
    const devState = devStateBlock(state)
    const initialArgs = [
      "-p",
      initialAnalysisPrompt(ticketContextBlock(context), devState),
      ...CHAT_ARGS,
      ...claudeArgs,
    ]

    const output = chatSessionId
      ? yield* Effect.gen(function* () {
          const lastBotIndex = lastIndexWhere(comments, (comment) => BOT_COMMENT.test(comment.text))
          const newMessages =
            comments
              .slice(lastBotIndex + 1)
              .filter((comment) => !STATUS_COMMENT.test(comment.text))
              .map((comment) => `[${comment.memberName}] ${comment.text}`)
              .join("\n---\n") || "(carte relancée sans nouveau message)"
          log(`  Reprise de la session de cadrage ${chatSessionId}…`)
          return yield* claude
            .run(
              ["-p", "--resume", chatSessionId, replyPrompt(newMessages, devState), ...CHAT_ARGS, ...claudeArgs],
              git.atelierWorktree,
              CHAT_TIMEOUT,
            )
            .pipe(
              Effect.catch((error) =>
                Effect.sync(() => logErr("  Reprise du cadrage impossible, nouvelle session :", error)).pipe(
                  Effect.andThen(
                    isImageFailure(error, context)
                      ? Effect.flatMap(
                          analysisWithoutImages(card, context, git.atelierWorktree, devState, claudeArgs),
                          (args) => claude.run(args, git.atelierWorktree, CHAT_TIMEOUT),
                        )
                      : claude.run(initialArgs, git.atelierWorktree, CHAT_TIMEOUT),
                  ),
                ),
              ),
            )
        })
      : yield* Effect.gen(function* () {
          log("  Analyse initiale du besoin…")
          return yield* claude
            .runNewSession(initialArgs, uuidForTicket(card.idShort, "chat"), git.atelierWorktree, CHAT_TIMEOUT)
            .pipe(
              // le modèle n'a pas pu lire les images : on rejoue l'analyse sans elles, en session neuve
              Effect.catch((error) =>
                isImageFailure(error, context)
                  ? Effect.flatMap(
                      analysisWithoutImages(card, context, git.atelierWorktree, devState, claudeArgs),
                      (args) => claude.run(args, git.atelierWorktree, CHAT_TIMEOUT),
                    )
                  : Effect.fail(error),
              ),
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
    for (const card of cards) {
      yield* processDiscussion(card).pipe(
        Effect.catchCause((cause) =>
          Effect.sync(() => logErr(`Cadrage du ticket #${card.idShort} :`, Cause.squash(cause))),
        ),
      )
    }
  })
