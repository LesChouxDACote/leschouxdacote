import type { TrelloCard } from "./schemas"

const REPO_INTRO =
  "Tu travailles sur le dépôt « Les Choux d'à Côté » (Next.js 12, conventions décrites dans CLAUDE.md)."

export const planPrompt = (ticketBlock: string) => `${REPO_INTRO}

${ticketBlock}

Rédige un PLAN d'implémentation concis et actionnable pour ce ticket : fichiers à modifier, étapes, points de vigilance. Consulte les pièces jointes listées le cas échéant. N'écris aucun code pour l'instant.`

export const IMPLEMENT_PROMPT = `Implémente maintenant ce plan dans le dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et « yarn eslint <fichiers modifiés> », puis corrige les erreurs éventuelles (le build du preview échoue sur la moindre erreur ESLint, par exemple une apostrophe non échappée dans du JSX).
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

export const retryPrompt = (
  card: TrelloCard,
  ticketBlock: string,
) => `Le traitement automatisé du ticket Trello #${card.idShort} (« ${card.name} ») a été relancé : la tentative précédente a échoué ou n'est pas allée au bout.

Rappel du ticket (la discussion peut contenir de nouvelles consignes) :
${ticketBlock}

Reprends l'implémentation du plan là où elle s'est arrêtée, dans l'état actuel du dépôt.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et « yarn eslint <fichiers modifiés> », puis corrige les erreurs éventuelles (le build du preview échoue sur la moindre erreur ESLint, par exemple une apostrophe non échappée dans du JSX).
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

export const iterationPrompt = (
  card: TrelloCard,
  ticketBlock: string,
  previewStatus?: string, // état du dernier déploiement du preview quand il n'est pas sain (cf. deploy.ts)
) => `Le ticket Trello #${card.idShort} (« ${card.name} ») revient pour une NOUVELLE ITÉRATION : une première implémentation a déjà été livrée (la PR existe, la branche contient ton travail précédent), mais le PO a fait de nouveaux retours.

Ticket et discussion à jour (les retours du PO sont dans les commentaires les plus récents) :
${ticketBlock}
${previewStatus ? `\n${previewStatus}\n` : ""}
Prends en compte les derniers retours du PO et adapte l'implémentation existante en conséquence.
Vérifie ton travail avec « yarn tsc --skipLibCheck --noEmit » et « yarn eslint <fichiers modifiés> », puis corrige les erreurs éventuelles (le build du preview échoue sur la moindre erreur ESLint, par exemple une apostrophe non échappée dans du JSX).
Si, après analyse, aucun changement de code n'est réellement nécessaire, explique pourquoi sans rien modifier.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

// correction d'un problème diagnostiqué par l'orchestrateur (garde-fou avant commit, build du preview)
export const fixPrompt = (
  card: TrelloCard,
  attempt: number,
  attempts: number,
  source: string,
  diagnostic: string,
) => `Ticket Trello #${card.idShort} (« ${card.name} ») — correction ${attempt}/${attempts} : ${source}.
Le preview est construit avec « yarn build » (next build : lint ESLint, vérification des types, compilation) sur la branche du ticket.

Diagnostic :
\`\`\`
${diagnostic}
\`\`\`

Analyse la cause et corrige-la dans le dépôt.
Vérifie ensuite avec « yarn tsc --skipLibCheck --noEmit » et « yarn eslint <fichiers modifiés> », puis corrige les erreurs éventuelles.
N'exécute pas « yarn build » toi-même (indisponible dans cet environnement) : appuie-toi sur le diagnostic ci-dessus.
Si le problème n'est PAS lié au code (réseau, mémoire du serveur, infrastructure), ne modifie rien et explique-le.
Ne fais AUCUN commit ni push : l'orchestrateur s'en charge.`

// le texte produit est publié tel quel : interdire tout méta-commentaire
const CHAT_STYLE = `Ta réponse sera postée telle quelle en commentaire Trello, adressée au PO, à la première personne, en français, concise (moins de 1 500 caractères).
AUCUN méta-commentaire : n'écris jamais « voici la réponse », n'annonce pas ce que tu vas faire, ne compte pas les caractères — ton texte EST le commentaire, rien d'autre.`

export const initialAnalysisPrompt = (ticketBlock: string) => `${REPO_INTRO}
Tu es en phase de CADRAGE de ce ticket avec le PO : AUCUN développement, le code est en lecture seule.

${ticketBlock}

Analyse le besoin : reformule-le en quelques lignes, vérifie sa faisabilité dans le code existant, signale les zones d'ombre et pose au PO les 2 à 4 questions les plus utiles pour affiner le ticket.
${CHAT_STYLE}`

export const replyPrompt = (newMessages: string) => `Nouveaux messages du PO sur le ticket :
${newMessages}

Réponds : clarifie, propose, challenge si nécessaire (tu peux vérifier dans le code, en lecture seule). Si le besoin te semble prêt à développer, dis-le au PO et propose-lui de déplacer la carte vers « Ready IA ».
${CHAT_STYLE}`
