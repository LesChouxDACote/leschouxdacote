import { execFile, spawn } from "child_process"
import { createHash } from "crypto"
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { addComment, getCards, getLists, moveCard, TrelloCard, TrelloList } from "src/helpers-api/trello"

const REPO_ROOT = process.cwd()
// surchargés en Docker pour pointer vers le volume persistant (voir docker-compose.yml)
const WORKTREES_DIR = process.env.IA_WORKTREES_DIR || path.resolve(REPO_ROOT, "..", ".ia-worktrees")
const STATE_FILE = process.env.IA_STATE_FILE || path.join(REPO_ROOT, ".ia-sessions.json")
const TRELLO_COMMENT_LIMIT = 15000 // Trello accepte 16384 caractères par commentaire
const CLAUDE_TIMEOUT = 45 * 60 * 1000
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

interface ResolvedLists {
  ready: TrelloList
  wip: TrelloList
  done: TrelloList
}

interface ClaudeOutput {
  result: string
  session_id: string
  is_error?: boolean
}

type TicketStatus = "plan" | "implement" | "done" | "failed"

interface TicketState {
  sessionId: string
  branch: string
  status: TicketStatus
  prUrl?: string
}

const readState = (): Record<string, TicketState> =>
  existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}

const saveTicketState = (idShort: number, ticket: TicketState) => {
  const state = readState()
  state[idShort] = ticket
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// UUID déterministe (style v5) dérivé du numéro de ticket : une session Claude par ticket
const uuidForTicket = (idShort: number) => {
  const hash = createHash("sha1").update(`leschouxdacote-trello-${idShort}`).digest("hex")
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

const runClaude = (args: string[], cwd: string) =>
  new Promise<ClaudeOutput>((resolve, reject) => {
    const child = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "inherit"] })
    let stdout = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })

    const watchdog = setTimeout(() => {
      child.kill()
      reject(new Error("claude : temps d'exécution dépassé (45 min)"))
    }, CLAUDE_TIMEOUT)

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
        resolve(output)
      }
    })
  })

const planPrompt = (
  card: TrelloCard,
) => `Tu travailles sur le dépôt « Les Choux d'à Côté » (Next.js 12, conventions décrites dans CLAUDE.md).

Ticket Trello #${card.idShort} — ${card.name}
${card.shortUrl}

Description :
${card.desc || "(pas de description)"}

Rédige un PLAN d'implémentation concis et actionnable pour ce ticket : fichiers à modifier, étapes, points de vigilance. N'écris aucun code pour l'instant.`

const IMPLEMENT_PROMPT = `Implémente maintenant ce plan dans le dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et corrige les erreurs éventuelles.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

const retryPrompt = (
  card: TrelloCard,
) => `Le traitement automatisé du ticket Trello #${card.idShort} (« ${card.name} ») a été relancé : la tentative précédente a échoué ou n'est pas allée au bout.
Reprends l'implémentation du plan là où elle s'est arrêtée, dans l'état actuel du dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et corrige les erreurs éventuelles.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

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

const processCard = async (card: TrelloCard, lists: ResolvedLists) => {
  const { branch, worktree } = ticketPaths(card)
  const state = readState()[card.idShort]

  console.log(`\n▶ Ticket #${card.idShort} « ${card.name} » → ${branch}`)
  await moveCard(card.id, lists.wip.id) // « claim » : évite tout retraitement pendant le run

  if (state?.status === "done") {
    console.log("  Ticket déjà traité, rien à faire")
    await addComment(
      card.id,
      `♻️ Ticket déjà traité par l'automatisation IA.\nBranche : ${state.branch}${state.prUrl ? `\nPR : ${state.prUrl}` : ""}`,
    )
    await moveCard(card.id, lists.done.id)
    return
  }

  // 1. Worktree isolé sur une branche issue de production
  await run("git", ["fetch", "origin", "production"])
  await removeWorktree(card) // nettoie les restes d'un run précédent
  const branchOnOrigin = await run("git", ["ls-remote", "--exit-code", "--heads", "origin", branch])
    .then(() => true)
    .catch(() => false)

  if (branchOnOrigin && !state) {
    throw new Error(`la branche ${branch} existe déjà sur origin (créée hors automatisation)`)
  }

  if (branchOnOrigin) {
    // retry : on repart de l'état déjà poussé
    await run("git", ["fetch", "origin", branch])
    await run("git", ["worktree", "add", worktree, "-B", branch, `origin/${branch}`])
  } else {
    await run("git", ["worktree", "add", worktree, "-b", branch, "origin/production"])
    await run("git", ["push", "-u", "origin", branch], worktree)
    console.log(`  Branche ${branch} créée depuis production et poussée`)
  }
  console.log("  yarn install…")
  await run("yarn", ["install"], worktree)

  // 2. Plan puis implémentation par Claude, dans la session du ticket
  let lastOutput: ClaudeOutput
  if (state) {
    console.log(`  Reprise de la session existante ${state.sessionId}…`)
    try {
      lastOutput = await runClaude(
        [
          "-p",
          "--resume",
          state.sessionId,
          retryPrompt(card),
          "--output-format",
          "json",
          "--permission-mode",
          "acceptEdits",
          "--allowedTools",
          ...ALLOWED_TOOLS,
        ],
        worktree,
      )
    } catch (error) {
      console.error("  Reprise impossible, nouvelle session :", error)
      lastOutput = await runClaude(
        ["-p", planPrompt(card), "--output-format", "json", "--permission-mode", "acceptEdits"],
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
          "--allowedTools",
          ...ALLOWED_TOOLS,
        ],
        worktree,
      )
    }
    saveTicketState(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
  } else {
    console.log("  Génération du plan…")
    const plan = await runClaude(
      [
        "-p",
        planPrompt(card),
        "--session-id",
        uuidForTicket(card.idShort),
        "--output-format",
        "json",
        "--permission-mode",
        "acceptEdits",
      ],
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
        "--allowedTools",
        ...ALLOWED_TOOLS,
      ],
      worktree,
    )
    saveTicketState(card.idShort, { sessionId: lastOutput.session_id, branch, status: "implement" })
  }

  // 3. Garde-fou typage puis commit + push par l'orchestrateur
  console.log("  Vérification tsc…")
  await run("yarn", ["tsc", "--skipLibCheck", "--noEmit"], worktree)

  const planFile = path.join(worktree, ".ia-plan.md")
  if (existsSync(planFile)) {
    unlinkSync(planFile)
  }
  const changes = await run("git", ["status", "--porcelain"], worktree)
  if (!changes) {
    throw new Error("aucun changement produit par l'implémentation")
  }
  await run("git", ["add", "-A"], worktree)
  await run("git", ["commit", "-m", `feat: ${card.name} (Trello #${card.idShort})`], worktree)
  await run("git", ["push", "-u", "origin", branch], worktree)
  console.log("  Changements commités et poussés")

  // 4. Pull request vers production
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
      "production",
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

  // 5. Rapport sur la carte et nettoyage
  const doneState = readState()[card.idShort]
  saveTicketState(card.idShort, { ...doneState, status: "done", prUrl })
  await addComment(card.id, `✅ Implémentation terminée.\nBranche : ${branch}\nPR : ${prUrl}`)
  await moveCard(card.id, lists.done.id)
  await removeWorktree(card)
}

const resolveLists = async (): Promise<ResolvedLists> => {
  const lists = await getLists(process.env.TRELLO_BOARD_ID as string)
  const find = (envName: string, fallback: string) => {
    const name = process.env[envName] || fallback
    const list = lists.find(({ name: listName }) => listName.toLowerCase() === name.toLowerCase())
    if (!list) {
      throw new Error(`Liste Trello « ${name} » introuvable sur le board`)
    }
    return list
  }
  return {
    ready: find("TRELLO_LIST_READY", "Ready IA"),
    wip: find("TRELLO_LIST_WIP", "IA en cours"),
    done: find("TRELLO_LIST_DONE", "IA terminé"),
  }
}

const handler = async () => {
  for (const name of ["TRELLO_API_KEY", "TRELLO_TOKEN", "TRELLO_BOARD_ID"]) {
    if (!process.env[name]) {
      throw new Error(`Variable d'environnement manquante : ${name}`)
    }
  }
  const lists = await resolveLists()
  mkdirSync(WORKTREES_DIR, { recursive: true })
  const pollMs = Number(process.env.TRELLO_POLL_MINUTES || 3) * 60 * 1000
  console.log(`Surveillance de la liste « ${lists.ready.name} » (toutes les ${pollMs / 60000} min)`)

  while (true) {
    try {
      const cards = await getCards(lists.ready.id)
      if (cards.length > 0) {
        const card = cards[0] // un seul ticket à la fois
        try {
          await processCard(card, lists)
        } catch (error) {
          console.error(error)
          const state = readState()[card.idShort]
          if (state) {
            saveTicketState(card.idShort, { ...state, status: "failed" })
          }
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
