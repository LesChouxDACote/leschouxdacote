// Adaptateur transitoire : expose les services Effect sous forme de fonctions Promise/synchrones
// pour le script historique, le temps de migrer l'orchestration (phase 3).
import { Duration, Effect, Layer } from "effect"
import { ClaudeRunner, ClaudeRunnerLive } from "./claude"
import { AppConfig, AppConfigLive } from "./config"
import { Git, GitLive, WorktreePaths } from "./git"
import { Preview, PreviewLive } from "./preview"
import type { TicketState, TrelloCard } from "./schemas"
import { Shell, ShellLive } from "./shell"
import { StateStore, StateStoreLive } from "./state"
import { TrelloClient, TrelloClientLive } from "./trello"

// les layers référencés deux fois (Shell, TrelloClient) ne sont construits qu'une fois (mémoïsation)
export const AppLayer = Layer.mergeAll(
  GitLive,
  PreviewLive,
  ClaudeRunnerLive,
  StateStoreLive,
  TrelloClientLive,
  ShellLive,
).pipe(Layer.provideMerge(Layer.mergeAll(ShellLive, TrelloClientLive)), Layer.provideMerge(AppConfigLive))

const servicesEffect = Effect.all({
  trello: TrelloClient,
  state: StateStore,
  config: AppConfig,
  shell: Shell,
  git: Git,
  claude: ClaudeRunner,
  preview: Preview,
})
type Services = Effect.Success<typeof servicesEffect>

let services: Services | undefined

// à appeler une fois au démarrage (résout la configuration et construit les services)
export const initServices = async () => {
  if (!services) {
    services = await Effect.runPromise(servicesEffect.pipe(Effect.provide(AppLayer)))
  }
  return services
}

const current = () => {
  if (!services) {
    throw new Error("initServices() doit être appelé avant d'utiliser les services")
  }
  return services
}

// --- Trello ---
export const getMe = () => Effect.runPromise(current().trello.getMe)
export const getLists = (boardId: string) => Effect.runPromise(current().trello.getLists(boardId))
export const getCards = (listId: string) => Effect.runPromise(current().trello.getCards(listId))
export const getCardDetails = (cardId: string) => Effect.runPromise(current().trello.getCardDetails(cardId))
export const getComments = (cardId: string) => Effect.runPromise(current().trello.getComments(cardId))
export const downloadAttachment = (url: string, destPath: string) =>
  Effect.runPromise(current().trello.downloadAttachment(url, destPath))
export const moveCard = (cardId: string, listId: string) => Effect.runPromise(current().trello.moveCard(cardId, listId))
export const addComment = (cardId: string, text: string) => Effect.runPromise(current().trello.addComment(cardId, text))

// --- État ---
export const readState = () => Effect.runSync(current().state.read)
export const saveTicketState = (idShort: number, ticket: Partial<TicketState>) =>
  Effect.runSync(current().state.save(idShort, ticket))

// --- Shell / Claude ---
export const run = (command: string, args: string[], cwd?: string) =>
  Effect.runPromise(current().shell.exec(command, args, cwd))
export const runClaude = (args: string[], cwd: string, timeout?: Duration.Input) =>
  Effect.runPromise(current().claude.run(args, cwd, timeout))
export const runClaudeNewSession = (args: string[], sessionId: string, cwd: string, timeout?: Duration.Input) =>
  Effect.runPromise(current().claude.runNewSession(args, sessionId, cwd, timeout))

// --- Git (la tâche Promise s'exécute sous le verrou ; son rejet est propagé tel quel) ---
export const withGitLock = <T>(task: () => Promise<T>): Promise<T> =>
  Effect.runPromise(current().git.locked(Effect.tryPromise({ try: task, catch: (error) => error })))
export const removeWorktreeFiles = (paths: WorktreePaths) => Effect.runPromise(current().git.removeWorktreeFiles(paths))
export const removeWorktree = (paths: WorktreePaths) => Effect.runPromise(current().git.removeWorktree(paths))
export const refreshAtelierWorktree = () => Effect.runPromise(current().git.refreshAtelierWorktree)

// --- Preview Coolify ---
export const previewUrlFor = (prUrl: string | undefined) => current().preview.urlFor(prUrl)
export const previewLineFor = (prUrl: string | undefined, label?: string) => current().preview.lineFor(prUrl, label)
export const previewBuildId = (url: string | undefined) => Effect.runPromise(current().preview.buildId(url))
export const notifyWhenPreviewIsLive = (card: TrelloCard, prUrl: string, previousBuildId?: string) =>
  Effect.runPromise(current().preview.notifyWhenLive(card, prUrl, previousBuildId))
