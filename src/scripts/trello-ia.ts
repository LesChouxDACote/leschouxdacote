import { execFile, spawn } from "child_process"
import { createHash } from "crypto"
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import {
  addComment,
  downloadAttachment,
  getCardDetails,
  getCards,
  getComments,
  getLists,
  getMe,
  moveCard,
  TrelloCard,
  TrelloCardDetails,
  TrelloComment,
  TrelloList,
} from "src/helpers-api/trello"

const REPO_ROOT = process.cwd()
// surchargés en Docker pour pointer vers le volume persistant (voir docker-compose.yml)
const WORKTREES_DIR = process.env.IA_WORKTREES_DIR || path.resolve(REPO_ROOT, "..", ".ia-worktrees")
const STATE_FILE = process.env.IA_STATE_FILE || path.join(REPO_ROOT, ".ia-sessions.json")
// branche de départ des tickets et cible des PR (develop = previews Coolify sur l'app dev)
const BASE_BRANCH = process.env.IA_BASE_BRANCH || "develop"
// worktree partagé, détaché sur la branche de base : contexte code des discussions de cadrage
const ATELIER_WORKTREE = path.join(WORKTREES_DIR, "_atelier")
const TICKET_DIR = ".ia-ticket" // pièces jointes du ticket, téléchargées pour Claude (jamais commitées)
const TRELLO_COMMENT_LIMIT = 15000 // Trello accepte 16384 caractères par commentaire
const DISCUSSION_LIMIT = 8000 // taille max de la discussion injectée dans les prompts
const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const CLAUDE_TIMEOUT = 45 * 60 * 1000
const CHAT_TIMEOUT = 10 * 60 * 1000
const ALLOWED_TOOLS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "Bash(yarn tsc:*)",
  "Bash(yarn lint:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
]
// cadrage : lecture seule garantie par le mode plan
const CHAT_ARGS = ["--output-format", "json", "--permission-mode", "plan"]

interface ResolvedLists {
  ready: TrelloList
  wip: TrelloList
  done: TrelloList
  refine?: TrelloList // optionnelle : sans elle, le cadrage est désactivé
}

interface ClaudeOutput {
  result: string
  session_id: string
  is_error?: boolean
  modelUsage?: Record<string, unknown> // clés = identifiants des modèles utilisés
}

type TicketStatus = "plan" | "implement" | "done" | "failed"

interface TicketState {
  sessionId?: string // session de développement (plan + implémentation)
  chatSessionId?: string // session de cadrage (Atelier IA)
  branch?: string
  status?: TicketStatus
  prUrl?: string
}

interface TicketContext {
  details: TrelloCardDetails
  comments: TrelloComment[]
  attachmentPaths: string[]
}

const readState = (): Record<string, TicketState> =>
  existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}

const saveTicketState = (idShort: number, ticket: Partial<TicketState>) => {
  const state = readState()
  state[idShort] = { ...state[idShort], ...ticket }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// UUID déterministe (style v5) dérivé du numéro de ticket : une session Claude par ticket et par usage
const uuidForTicket = (idShort: number, kind: "dev" | "chat" = "dev") => {
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

const truncate = (text: string) =>
  text.length > TRELLO_COMMENT_LIMIT ? text.slice(0, TRELLO_COMMENT_LIMIT) + "\n…" : text

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const lastIndexWhere = <T>(items: T[], predicate: (item: T) => boolean) => {
  for (let index = items.length - 1; index >= 0; index--) {
    if (predicate(items[index])) {
      return index
    }
  }
  return -1
}

const run = (command: string, args: string[], cwd = REPO_ROOT) =>
  new Promise<string>((resolve, reject) => {
    execFile(command, args, { cwd, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${command} ${args.join(" ")} : ${stderr.trim() || error.message}`))
      } else {
        resolve(stdout.trim())
      }
    })
  })

const runClaude = (args: string[], cwd: string, timeoutMs = CLAUDE_TIMEOUT) =>
  new Promise<ClaudeOutput>((resolve, reject) => {
    const child = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "inherit"] })
    let stdout = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })

    const watchdog = setTimeout(() => {
      child.kill()
      reject(new Error(`claude : temps d'exécution dépassé (${Math.round(timeoutMs / 60000)} min)`))
    }, timeoutMs)

    child.on("error", (error) => {
      clearTimeout(watchdog)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(watchdog)
      let output: ClaudeOutput | undefined
      try {
        output = JSON.parse(stdout)
      } catch (error) {
        // sortie non JSON : traitée comme un échec ci-dessous
      }
      if (code !== 0 || !output || output.is_error) {
        reject(
          new Error(`claude : échec (code ${code}) : ${(output?.result || stdout || "aucune sortie").slice(-2000)}`),
        )
      } else {
        console.log(`  Modèle(s) Claude : ${Object.keys(output.modelUsage ?? {}).join(", ") || "non renseigné"}`)
        resolve(output)
      }
    })
  })

// première session d'un ticket : UUID déterministe, avec repli en session anonyme s'il est déjà pris
const runClaudeNewSession = async (args: string[], sessionId: string, cwd: string, timeoutMs?: number) => {
  try {
    return await runClaude([...args, "--session-id", sessionId], cwd, timeoutMs)
  } catch (error) {
    console.error("  --session-id indisponible, session anonyme :", error)
    return runClaude(args, cwd, timeoutMs)
  }
}

// ---------------------------------------------------------------------------
// Contexte complet du ticket (carte + checklists + pièces jointes + discussion)
// ---------------------------------------------------------------------------

const STATUS_COMMENT = /^(📋|✅|♻️|⚠️|🌐)/ // commentaires de statut de l'automatisation, exclus des prompts
// détection par préfixe et non par auteur : le PO peut commenter avec le compte Trello du token
const BOT_COMMENT = /^(🤖|📋|✅|♻️|⚠️|🌐)/

// étiquette Trello → modèle Claude du ticket (prime sur ANTHROPIC_MODEL, cf. --model du CLI)
const MODEL_LABELS: Record<string, string> = {
  opus: "opus",
  sonnet: "sonnet",
  haiku: "haiku",
  fable: "claude-fable-5", // pas d'alias CLI, et nécessite un compte y ayant accès
}
const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"]

// étiquettes de la carte → arguments claude optionnels : modèle (opus/sonnet/haiku/fable ou
// model:<id>) et effort (effort:low|medium|high|xhigh|max) ; sans étiquette, défauts du CLI
const claudeArgsFor = (details: TrelloCardDetails) => {
  const args: string[] = []
  for (const label of details.labels) {
    const name = (label.name || "").trim().toLowerCase()
    const model = MODEL_LABELS[name] || (name.startsWith("model:") ? name.slice("model:".length).trim() : undefined)
    if (model && !args.includes("--model")) {
      console.log(`  Modèle demandé par étiquette : ${model}`)
      args.push("--model", model)
    }
    if (name.startsWith("effort:") && !args.includes("--effort")) {
      const level = name.slice("effort:".length).trim()
      if (EFFORT_LEVELS.includes(level)) {
        console.log(`  Effort demandé par étiquette : ${level}`)
        args.push("--effort", level)
      } else {
        console.log(`  Étiquette effort ignorée (niveau inconnu : « ${level} », attendu ${EFFORT_LEVELS.join("/")})`)
      }
    }
  }
  return args
}

const fetchAttachments = async (details: TrelloCardDetails, dir: string) => {
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
    try {
      await downloadAttachment(attachment.url, destPath)
      paths.push(path.relative(dir, destPath))
      console.log(`  Pièce jointe téléchargée : ${path.relative(dir, destPath)}`)
    } catch (error) {
      console.error(`  Pièce jointe « ${attachment.name} » ignorée :`, error)
    }
  }
  return paths
}

const loadTicketContext = async (card: TrelloCard, dir: string): Promise<TicketContext> => {
  const details = await getCardDetails(card.id)
  const comments = await getComments(card.id)
  const attachmentPaths = await fetchAttachments(details, dir)
  return { details, comments, attachmentPaths }
}

const formatDiscussion = (comments: TrelloComment[]) => {
  const lines = comments
    .filter((comment) => !STATUS_COMMENT.test(comment.text))
    .map((comment) => `[${BOT_COMMENT.test(comment.text) ? "IA" : comment.memberName}] ${comment.text}`)
  const text = lines.join("\n---\n")
  return text.length > DISCUSSION_LIMIT ? `…${text.slice(-DISCUSSION_LIMIT)}` : text
}

const ticketContextBlock = (context: TicketContext) => {
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

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const REPO_INTRO =
  "Tu travailles sur le dépôt « Les Choux d'à Côté » (Next.js 12, conventions décrites dans CLAUDE.md)."

const planPrompt = (ticketBlock: string) => `${REPO_INTRO}

${ticketBlock}

Rédige un PLAN d'implémentation concis et actionnable pour ce ticket : fichiers à modifier, étapes, points de vigilance. Consulte les pièces jointes listées le cas échéant. N'écris aucun code pour l'instant.`

const IMPLEMENT_PROMPT = `Implémente maintenant ce plan dans le dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et corrige les erreurs éventuelles.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

const retryPrompt = (
  card: TrelloCard,
  ticketBlock: string,
) => `Le traitement automatisé du ticket Trello #${card.idShort} (« ${card.name} ») a été relancé : la tentative précédente a échoué ou n'est pas allée au bout.

Rappel du ticket (la discussion peut contenir de nouvelles consignes) :
${ticketBlock}

Reprends l'implémentation du plan là où elle s'est arrêtée, dans l'état actuel du dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et corrige les erreurs éventuelles.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

const initialAnalysisPrompt = (ticketBlock: string) => `${REPO_INTRO}
Tu es en phase de CADRAGE de ce ticket avec le PO : AUCUN développement, le code est en lecture seule.

${ticketBlock}

Analyse le besoin : reformule-le en quelques lignes, vérifie sa faisabilité dans le code existant, signale les zones d'ombre et pose au PO les 2 à 4 questions les plus utiles pour affiner le ticket.
Ta réponse sera postée telle quelle en commentaire Trello : concise (moins de 1 500 caractères), en français, sans préambule.`

const replyPrompt = (newMessages: string) => `Nouveaux messages du PO sur le ticket :
${newMessages}

Réponds : clarifie, propose, challenge si nécessaire (tu peux vérifier dans le code, en lecture seule). Si le besoin te semble prêt à développer, dis-le au PO et propose-lui de déplacer la carte vers « Ready IA ».
Ta réponse sera postée telle quelle en commentaire Trello : concise (moins de 1 500 caractères), en français, sans préambule.`

// ---------------------------------------------------------------------------
// Git : worktrees
// ---------------------------------------------------------------------------

const ticketPaths = (card: TrelloCard) => {
  const slug = slugify(card.name)
  return {
    branch: `ia/${card.idShort}-${slug}`,
    worktree: path.join(WORKTREES_DIR, `${card.idShort}-${slug}`),
  }
}

const removeWorktree = async (card: TrelloCard) => {
  const { branch, worktree } = ticketPaths(card)
  if (existsSync(worktree)) {
    await run("git", ["worktree", "remove", "--force", worktree]).catch(() => {
      rmSync(worktree, { recursive: true, force: true })
    })
  }
  await run("git", ["worktree", "prune"]).catch(() => undefined)
  await run("git", ["branch", "-D", branch]).catch(() => undefined) // la branche distante n'est pas touchée
}

// (re)met le worktree de cadrage sur la tête de la branche de base
const refreshAtelierWorktree = async () => {
  await run("git", ["fetch", "origin", BASE_BRANCH])
  const recreate = async () => {
    await run("git", ["worktree", "remove", "--force", ATELIER_WORKTREE]).catch(() => {
      rmSync(ATELIER_WORKTREE, { recursive: true, force: true })
    })
    await run("git", ["worktree", "prune"]).catch(() => undefined)
    await run("git", ["worktree", "add", "--detach", ATELIER_WORKTREE, `origin/${BASE_BRANCH}`])
  }
  if (existsSync(ATELIER_WORKTREE)) {
    await run("git", ["checkout", "--detach", `origin/${BASE_BRANCH}`], ATELIER_WORKTREE).catch(recreate)
  } else {
    await recreate()
  }
}

// ---------------------------------------------------------------------------
// Preview Coolify
// ---------------------------------------------------------------------------

// PREVIEW_URL_TEMPLATE (ex. https://{{pr_id}}.choux.ilieff.fr, même placeholder que Coolify)
const previewUrlFor = (prUrl: string | undefined) => {
  const prNumber = prUrl?.split("/").pop()
  const template = process.env.PREVIEW_URL_TEMPLATE
  return template && prNumber ? template.replace("{{pr_id}}", prNumber) : undefined
}

const previewLineFor = (prUrl: string | undefined, label = "Preview") => {
  const url = previewUrlFor(prUrl)
  return url ? `\n${label} : ${url}` : ""
}

// pingue le preview jusqu'à ce qu'il réponde, puis le signale sur la carte (lancé sans await :
// le watcher continue de traiter les tickets pendant l'attente)
const notifyWhenPreviewIsLive = async (card: TrelloCard, prUrl: string) => {
  const url = previewUrlFor(prUrl)
  if (!url) {
    return
  }
  console.log(`  Ping du preview ${url} (toutes les 30 s, 15 min max)…`)
  const deadline = Date.now() + 15 * 60 * 1000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (response.ok) {
        console.log(`  Preview en ligne : ${url}`)
        await addComment(card.id, `🌐 Preview en ligne : ${url}`)
        return
      }
    } catch (error) {
      // DNS/certificat/build pas encore prêts : on réessaie
    }
    await sleep(30 * 1000)
  }
  console.log(`  Preview toujours indisponible après 15 min : ${url}`)
}

// ---------------------------------------------------------------------------
// Cadrage (« Atelier IA ») : discussion sur la carte, sans toucher au code
// ---------------------------------------------------------------------------

const processDiscussion = async (card: TrelloCard) => {
  const comments = await getComments(card.id)
  const lastComment = comments[comments.length - 1]
  if (lastComment && BOT_COMMENT.test(lastComment.text)) {
    console.log(`💬 #${card.idShort} « ${card.name} » : en attente d'une réponse du PO`)
    return // dernier mot au bot : on attend la réponse du PO
  }

  console.log(
    `\n💬 Cadrage du ticket #${card.idShort} « ${card.name} » (${comments.length} commentaire(s), dernier : ${lastComment ? lastComment.memberName : "aucun"})`,
  )
  await refreshAtelierWorktree()
  const context = await loadTicketContext(card, ATELIER_WORKTREE)
  const claudeArgs = claudeArgsFor(context.details)
  const state = readState()[card.idShort]

  let output: ClaudeOutput
  if (state?.chatSessionId) {
    const lastBotIndex = lastIndexWhere(comments, (comment) => BOT_COMMENT.test(comment.text))
    const newMessages =
      comments
        .slice(lastBotIndex + 1)
        .filter((comment) => !STATUS_COMMENT.test(comment.text))
        .map((comment) => `[${comment.memberName}] ${comment.text}`)
        .join("\n---\n") || "(carte relancée sans nouveau message)"
    console.log(`  Reprise de la session de cadrage ${state.chatSessionId}…`)
    try {
      output = await runClaude(
        ["-p", "--resume", state.chatSessionId, replyPrompt(newMessages), ...CHAT_ARGS, ...claudeArgs],
        ATELIER_WORKTREE,
        CHAT_TIMEOUT,
      )
    } catch (error) {
      console.error("  Reprise du cadrage impossible, nouvelle session :", error)
      output = await runClaude(
        ["-p", initialAnalysisPrompt(ticketContextBlock(context)), ...CHAT_ARGS, ...claudeArgs],
        ATELIER_WORKTREE,
        CHAT_TIMEOUT,
      )
    }
  } else {
    console.log("  Analyse initiale du besoin…")
    output = await runClaudeNewSession(
      ["-p", initialAnalysisPrompt(ticketContextBlock(context)), ...CHAT_ARGS, ...claudeArgs],
      uuidForTicket(card.idShort, "chat"),
      ATELIER_WORKTREE,
      CHAT_TIMEOUT,
    )
  }
  saveTicketState(card.idShort, { chatSessionId: output.session_id })
  await addComment(card.id, truncate(`🤖 ${output.result}`))
}

const processDiscussions = async (lists: ResolvedLists) => {
  if (!lists.refine) {
    return
  }
  const cards = await getCards(lists.refine.id)
  if (cards.length > 0) {
    console.log(`\nAtelier : ${cards.length} carte(s) dans « ${lists.refine.name} »`)
  }
  for (const card of cards) {
    try {
      await processDiscussion(card)
    } catch (error) {
      console.error(`Cadrage du ticket #${card.idShort} :`, error)
    }
  }
}

// ---------------------------------------------------------------------------
// Développement (« Ready IA ») : plan, implémentation, PR
// ---------------------------------------------------------------------------

const processCard = async (card: TrelloCard, lists: ResolvedLists) => {
  const { branch, worktree } = ticketPaths(card)
  const state = readState()[card.idShort]

  console.log(`\n▶ Ticket #${card.idShort} « ${card.name} » → ${branch}`)
  await moveCard(card.id, lists.wip.id) // « claim » : évite tout retraitement pendant le run

  if (state?.status === "done") {
    console.log("  Ticket déjà traité, rien à faire")
    await addComment(
      card.id,
      `♻️ Ticket déjà traité par l'automatisation IA.\nBranche : ${state.branch}${state.prUrl ? `\nPR : ${state.prUrl}` : ""}${previewLineFor(state.prUrl)}`,
    )
    await moveCard(card.id, lists.done.id)
    return
  }

  // 1. Worktree isolé sur une branche issue de la branche de base
  await run("git", ["fetch", "origin", BASE_BRANCH])
  await removeWorktree(card) // nettoie les restes d'un run précédent
  const branchOnOrigin = await run("git", ["ls-remote", "--exit-code", "--heads", "origin", branch])
    .then(() => true)
    .catch(() => false)

  if (branchOnOrigin && !state?.sessionId) {
    throw new Error(`la branche ${branch} existe déjà sur origin (créée hors automatisation)`)
  }

  if (branchOnOrigin) {
    // retry : on repart de l'état déjà poussé
    await run("git", ["fetch", "origin", branch])
    await run("git", ["worktree", "add", worktree, "-B", branch, `origin/${branch}`])
  } else {
    await run("git", ["worktree", "add", worktree, "-b", branch, `origin/${BASE_BRANCH}`])
    await run("git", ["push", "-u", "origin", branch], worktree)
    console.log(`  Branche ${branch} créée depuis ${BASE_BRANCH} et poussée`)
  }
  console.log("  yarn install…")
  await run("yarn", ["install"], worktree)

  // 2. Contexte complet du ticket (carte, checklists, pièces jointes, discussion de cadrage)
  const context = await loadTicketContext(card, worktree)
  const ticketBlock = ticketContextBlock(context)
  const claudeArgs = claudeArgsFor(context.details)

  // 3. Plan puis implémentation par Claude, dans la session du ticket
  let lastOutput: ClaudeOutput
  if (state?.sessionId) {
    console.log(`  Reprise de la session existante ${state.sessionId}…`)
    try {
      lastOutput = await runClaude(
        [
          "-p",
          "--resume",
          state.sessionId,
          retryPrompt(card, ticketBlock),
          "--output-format",
          "json",
          "--permission-mode",
          "acceptEdits",
          ...claudeArgs,
          "--allowedTools",
          ...ALLOWED_TOOLS,
        ],
        worktree,
      )
    } catch (error) {
      console.error("  Reprise impossible, nouvelle session :", error)
      lastOutput = await runClaude(
        ["-p", planPrompt(ticketBlock), "--output-format", "json", "--permission-mode", "acceptEdits", ...claudeArgs],
        worktree,
      )
      saveTicketState(card.idShort, { sessionId: lastOutput.session_id, branch, status: "plan" })
      await addComment(card.id, truncate(`📋 Plan (nouvelle tentative) :\n\n${lastOutput.result}`))
      lastOutput = await runClaude(
        [
          "-p",
          "--resume",
          lastOutput.session_id,
          IMPLEMENT_PROMPT,
          "--output-format",
          "json",
          "--permission-mode",
          "acceptEdits",
          ...claudeArgs,
          "--allowedTools",
          ...ALLOWED_TOOLS,
        ],
        worktree,
      )
    }
    saveTicketState(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
  } else {
    console.log("  Génération du plan…")
    const plan = await runClaudeNewSession(
      ["-p", planPrompt(ticketBlock), "--output-format", "json", "--permission-mode", "acceptEdits", ...claudeArgs],
      uuidForTicket(card.idShort),
      worktree,
    )
    saveTicketState(card.idShort, { sessionId: plan.session_id, branch, status: "plan" })
    writeFileSync(path.join(worktree, ".ia-plan.md"), plan.result)
    await addComment(card.id, truncate(`📋 Plan :\n\n${plan.result}`))

    console.log("  Implémentation du plan…")
    lastOutput = await runClaude(
      [
        "-p",
        "--resume",
        plan.session_id,
        IMPLEMENT_PROMPT,
        "--output-format",
        "json",
        "--permission-mode",
        "acceptEdits",
        ...claudeArgs,
        "--allowedTools",
        ...ALLOWED_TOOLS,
      ],
      worktree,
    )
    saveTicketState(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
  }

  // 4. Garde-fous typage + formatage puis commit + push par l'orchestrateur
  console.log("  Vérification tsc…")
  await run("yarn", ["tsc", "--skipLibCheck", "--noEmit"], worktree)

  const planFile = path.join(worktree, ".ia-plan.md")
  if (existsSync(planFile)) {
    unlinkSync(planFile)
  }
  rmSync(path.join(worktree, TICKET_DIR), { recursive: true, force: true }) // pièces jointes jamais commitées

  // le build Next échoue sur la règle prettier/prettier : on formate tout ce que le ticket a touché,
  // y compris les commits déjà poussés lors d'une tentative précédente (retry)
  const committedFiles = await run("git", ["diff", "--name-only", `origin/${BASE_BRANCH}...HEAD`], worktree)
  const statusLines = await run("git", ["status", "--porcelain"], worktree)
  const pendingFiles = statusLines
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3)
      return (raw.includes(" -> ") ? raw.split(" -> ")[1] : raw).replace(/^"|"$/g, "")
    })
  const touchedFiles = Array.from(new Set([...committedFiles.split("\n").filter(Boolean), ...pendingFiles])).filter(
    (file) => existsSync(path.join(worktree, file)),
  )
  const prettierFiles = touchedFiles.filter((file) => /\.(ts|tsx|js|jsx|json|css|scss|md)$/.test(file))
  if (prettierFiles.length > 0) {
    console.log("  Formatage Prettier…")
    await run("yarn", ["prettier", "--write", ...prettierFiles], worktree)
  }
  const lintFiles = touchedFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
  if (lintFiles.length > 0) {
    console.log("  ESLint --fix…")
    await run("yarn", ["eslint", "--fix", ...lintFiles], worktree)
  }

  const changes = await run("git", ["status", "--porcelain"], worktree)
  if (!changes) {
    throw new Error("aucun changement produit par l'implémentation")
  }
  await run("git", ["add", "-A"], worktree)
  await run("git", ["commit", "-m", `feat: ${card.name} (Trello #${card.idShort})`], worktree)
  await run("git", ["push", "-u", "origin", branch], worktree)
  console.log("  Changements commités et poussés")

  // 5. Pull request vers la branche de base
  const bodyFile = path.join(tmpdir(), `ia-pr-${card.idShort}.md`)
  writeFileSync(
    bodyFile,
    `Ticket Trello : ${card.shortUrl}\n\n${lastOutput.result}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
  )
  const prUrl = await run(
    "gh",
    [
      "pr",
      "create",
      "--base",
      BASE_BRANCH,
      "--head",
      branch,
      "--title",
      `[IA] #${card.idShort} ${card.name}`,
      "--body-file",
      bodyFile,
    ],
    worktree,
  ).finally(() => unlinkSync(bodyFile))
  console.log(`  PR créée : ${prUrl}`)
  const previewUrl = previewUrlFor(prUrl)
  console.log(
    previewUrl ? `  Preview attendue : ${previewUrl}` : "  PREVIEW_URL_TEMPLATE non définie : pas de lien preview",
  )

  // 6. Rapport sur la carte et nettoyage
  saveTicketState(card.idShort, { status: "done", prUrl })
  await addComment(
    card.id,
    `✅ Implémentation terminée.\nBranche : ${branch}\nPR : ${prUrl}${previewLineFor(prUrl, "⏳ Preview en cours de déploiement")}`,
  )
  await moveCard(card.id, lists.done.id)
  await removeWorktree(card)
  notifyWhenPreviewIsLive(card, prUrl).catch(console.error) // en tâche de fond, sans bloquer la boucle
}

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------

const resolveLists = async (): Promise<ResolvedLists> => {
  const lists = await getLists(process.env.TRELLO_BOARD_ID as string)
  const findByName = (envName: string, fallback: string) => {
    const name = process.env[envName] || fallback
    return { name, list: lists.find(({ name: listName }) => listName.toLowerCase() === name.toLowerCase()) }
  }
  const mustFind = (envName: string, fallback: string) => {
    const { name, list } = findByName(envName, fallback)
    if (!list) {
      throw new Error(`Liste Trello « ${name} » introuvable sur le board`)
    }
    return list
  }
  const { name: refineName, list: refine } = findByName("TRELLO_LIST_REFINE", "Atelier IA")
  if (!refine) {
    console.log(`Liste « ${refineName} » absente du board : cadrage IA désactivé`)
  }
  return {
    ready: mustFind("TRELLO_LIST_READY", "Ready IA"),
    wip: mustFind("TRELLO_LIST_WIP", "IA en cours"),
    done: mustFind("TRELLO_LIST_DONE", "IA terminé"),
    refine,
  }
}

const handler = async () => {
  for (const name of ["TRELLO_API_KEY", "TRELLO_TOKEN", "TRELLO_BOARD_ID"]) {
    if (!process.env[name]) {
      throw new Error(`Variable d'environnement manquante : ${name}`)
    }
  }
  const me = await getMe()
  const lists = await resolveLists()
  mkdirSync(WORKTREES_DIR, { recursive: true })
  const pollMs = Number(process.env.TRELLO_POLL_MINUTES || 3) * 60 * 1000
  console.log(`Connecté à Trello : ${me.fullName || me.username}`)
  console.log(`Surveillance de la liste « ${lists.ready.name} » (toutes les ${pollMs / 60000} min)`)
  if (lists.refine) {
    console.log(`Cadrage actif sur la liste « ${lists.refine.name} »`)
  }
  console.log(
    process.env.ANTHROPIC_MODEL
      ? `Modèle Claude forcé : ${process.env.ANTHROPIC_MODEL}`
      : "Modèle Claude : défaut du compte (définir ANTHROPIC_MODEL pour forcer)",
  )

  while (true) {
    // 1. cadrage : répondre aux cartes de l'Atelier (léger, en premier pour rester réactif)
    try {
      await processDiscussions(lists)
    } catch (error) {
      console.error("Erreur de cadrage :", error)
    }

    // 2. développement : traiter une carte Ready
    try {
      const cards = await getCards(lists.ready.id)
      if (cards.length > 0) {
        const card = cards[0] // un seul ticket à la fois
        try {
          await processCard(card, lists)
        } catch (error) {
          console.error(error)
          saveTicketState(card.idShort, { status: "failed" })
          const message = error instanceof Error ? error.message : String(error)
          // la carte reste dans la liste WIP : un humain décide de la remettre en Ready ou non
          await addComment(card.id, truncate(`⚠️ Automatisation IA échouée : ${message}`)).catch(console.error)
          await removeWorktree(card).catch(console.error)
        }
      }
    } catch (error) {
      console.error("Erreur de polling Trello :", error)
    }
    await sleep(pollMs)
  }
}

// pas de process.exit(0) : ce script est un watcher qui ne se termine jamais
handler().catch((error) => {
  console.error(error)
  process.exit(1)
})
