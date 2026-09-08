// Vérification des règles 🚫 (pièces jointes écartées par le PO depuis Trello) :
//   yarn ts-node --files src/scripts/trello-ia/ticket.check.ts
import assert from "assert"
import type { TrelloComment } from "./schemas"
import { attachmentsToIgnore, isIgnored, isImageFailure, type TicketContext, withoutImages } from "./ticket"

const comment = (text: string): TrelloComment => ({ id: "1", date: "", memberId: "m", memberName: "PO", text })
const rules = (...texts: string[]) => attachmentsToIgnore(texts.map(comment))

// un nom cité : celui-là seulement
const one = rules("🚫 capture-2.png")
assert(isIgnored("capture-2.png", one))
assert(!isIgnored("maquette.png", one))

// plusieurs noms, séparés par des virgules ou des retours à la ligne
const many = rules("🚫 capture-2.png, photo3.jpg\nvieille photo.png")
assert(isIgnored("photo3.jpg", many) && isIgnored("vieille photo.png", many))
assert(!isIgnored("maquette.png", many))

// 🚫 seul : toutes les pièces jointes
const all = rules("🚫")
assert(isIgnored("maquette.png", all) && isIgnored("cahier-des-charges.pdf", all))

// nom cité sans extension (correspondance par préfixe)
assert(isIgnored("photo3.jpg", rules("🚫 photo3")))

// casse, accents et espaces : même normalisation des deux côtés
assert(isIgnored("capture d'écran.png", rules("🚫 Capture d'Écran.PNG")))

// un commentaire ordinaire ne filtre rien, plusieurs commentaires 🚫 s'additionnent
assert(!isIgnored("photo.png", rules("Merci, pense à la photo.png")))
const two = rules("🚫 a.png", "on continue", "🚫 b.png")
assert(isIgnored("a.png", two) && isIgnored("b.png", two) && !isIgnored("c.png", two))

// aucune discussion : rien n'est écarté
assert(!isIgnored("photo.png", rules()))

// --- repli « texte seul » quand l'upstream sature sur les images ---

const context = (attachmentPaths: string[], imagePaths: string[]) =>
  ({ details: {}, comments: [], attachmentPaths, imagePaths }) as unknown as TicketContext
const withImage = context([".ia-ticket/216/notes.pdf", ".ia-ticket/216/capture.png"], [".ia-ticket/216/capture.png"])
// texte réellement remonté par le proxy le 08/09/2026
const cuda = {
  message:
    "claude : échec (code 1) : API Error: 500 InternalServerError: OpenAIException - Internal server error: CUDA out of memory. Tried to allocate 20.00 MiB.",
}

assert(isImageFailure(cuda, withImage))
// un échec ordinaire reste un échec : pas de seconde tentative
assert(!isImageFailure({ message: "claude : temps d'exécution dépassé (45 min)" }, withImage))
assert(!isImageFailure({ message: "claude : échec (code 1) : garde-fou eslint en échec" }, withImage))
// même message, mais le ticket n'a aucune image : rien à retirer
assert(!isImageFailure(cuda, context([".ia-ticket/216/notes.pdf"], [])))

// le repli retire les images et garde les autres pièces jointes
const reduced = withoutImages(withImage)
assert(reduced.attachmentPaths.length === 1 && reduced.attachmentPaths[0].endsWith("notes.pdf"))
assert(reduced.imagePaths.length === 0)

console.log("✅ règles 🚫 et repli sans images : tous les cas passent")
