# Les Choux d'à Côté

Classified food ads.
[leschouxdacote.fr](https://leschouxdacote.fr/)

## Requirements

- [Node](https://nodejs.org/) v22+
- [Yarn](https://yarnpkg.com/) 4 (via `corepack enable`, version épinglée par `packageManager`)

## Config

    cp {example,}.env

## Commands

- `yarn dev`: start development mode
- `yarn lint`: check linting (Eslint + Prettier)
- `yarn build`: make production bundle

Copy the `.env.example` file to `.env` and fill in the required values.

## Environment variables

NEXT_PUBLIC_BUGSNAG is the key for the bugsnag service

## Firebase

Ask to Anthony access to "les-choux-da-cote" project on Firebase for dev environment.

See :
<https://console.firebase.google.com/u/0/project/les-choux-da-cote/settings/general/web:ZDc1MDA1YTEtYzBhZS00ZjdiLWFhMWItMmE1ZDg5OTBhMTVh>

And get the keys for the project as :

In .env

NEXT_PUBLIC_FIREBASE_KEY is apiKey
NEXT_PUBLIC_FIREBASE_PROJECT is les-choux-da-cote
NEXT_PUBLIC_FIREBASE_MESSAGING is messagingSenderId
NEXT_PUBLIC_FIREBASE_ID is appId
NEXT_PUBLIC_FIREBASE_MEASURE is measurementId

FIREBASE_PRIVATE_KEY => See Vaultwarden

## Vaultwarden

Ask to Charles to access to the Vaultwarden

## Algolia

You can find you API keys in the Algolia dashboard. <https://dashboard.algolia.com/account/api-keys/all?applicationId=RGBETVVUMX>

In .env

NEXT_PUBLIC_ALGOLIA_APP_ID is Application ID

NEXT_PUBLIC_ALGOLIA_API_KEY is Search API Key

## Mapbox

Ask to Anthony for the Mapbox key

## Insee

Ask to Anthony for the Insee key

For other env variable go the Github repository and Security > Secrets and Variables > Actions

## Github repository ask to Jerome or Charles for the right to push on the repository

## Deployment

The project is deployed on Vercel for preprod and prod.
Every commit on branch "develop" is deployed on the dev environment.
Every commit on branch "production" is deployed on the production environment.

For dev environment, it is deploy on coolify.ilieff.fr
Ask Charles to access to the Coolify project.

## Alerts Emails for new products and expired product

Two schedule actions in Github actions : "Alerts for expired product" and "Alerts for new products" are used for dev and prod environment.
Maybe we should change this for Vercel Cron ?

## Automatisation Trello + IA

`yarn watch-trello` lance un watcher qui surveille deux listes du board Trello :

**« Atelier IA » (cadrage, optionnelle)** : Claude lit le ticket complet (description, checklists, labels,
pièces jointes téléchargées — y compris les images — et commentaires) et discute avec le PO en commentaires 🤖 :
reformulation du besoin, faisabilité vérifiée dans le code (lecture seule stricte), questions. Il répond à chaque
nouveau message du PO. Quand le besoin est prêt, le PO déplace lui-même la carte vers « Ready IA ».
Le cadrage tourne dans une boucle indépendante (`TRELLO_CHAT_POLL_MINUTES`, 1 min par défaut) : les réponses
arrivent même pendant qu'une implémentation est en cours.

**« Ready IA » (développement)** : création d'une branche `ia/<n°>-<titre>` depuis `develop` (poussée immédiatement),
génération d'un plan puis implémentation par Claude Code — avec tout le contexte du ticket, y compris la discussion
de cadrage — puis commit + push, ouverture d'une PR vers `develop`, commentaires et déplacement de la carte
(« IA en cours » → « IA terminé »). Une session Claude par ticket, reprise en cas de relance.
Remettre une carte déjà livrée dans « Ready IA » déclenche une **itération** : Claude reprend sa session,
prend en compte les derniers commentaires du PO et met à jour la même branche et la même PR
(ou explique en commentaire ♻️ pourquoi aucun changement n'est nécessaire).
La branche de base est configurable via `IA_BASE_BRANCH` ; si `PREVIEW_URL_TEMPLATE` est définie
(ex. `https://{{pr_id}}.choux.ilieff.fr`), le lien du preview Coolify est ajouté au commentaire ✅ de la carte,
puis un commentaire 🌐 est posté dès que le preview répond réellement (ping toutes les 30 s, 15 min max).

**Suivi du déploiement et auto-correction (optionnel)** : avec `COOLIFY_API_URL`, `COOLIFY_API_TOKEN` et
`COOLIFY_APP_UUID`, le watcher suit via l'API Coolify le déploiement du preview correspondant au commit poussé.
La carte reste dans « IA en cours » jusqu'à ce que le preview soit en ligne (🌐, puis « IA terminé »).
Si le déploiement échoue, il récupère les logs du déploiement quand l'API les expose ; sinon (Coolify 4.3.x
les masque) il rejoue `yarn build` dans le worktree du ticket pour reproduire l'erreur. Le diagnostic est
transmis à Claude (même session) qui corrige ; les garde-fous sont rejoués, un commit `fix:` est poussé
(🛠️ puis 🔁 sur la carte) et le nouveau déploiement est suivi à son tour. Si l'échec n'est pas reproductible
(réseau, mémoire…), le déploiement est simplement relancé. Après la dernière tentative, un ⚠️ avec le lien
vers les logs du déploiement dans Coolify est posté et la carte reste dans « IA en cours ».
`IA_DEPLOY_TIMEOUT_MINUTES` : attente max par déploiement (30).

**Garde-fous avant commit** : Prettier et ESLint `--fix` sur les fichiers touchés, `tsc`, puis ESLint sur tout
`src` (la phase lint/typage de `next build`). Une erreur est transmise à Claude qui la corrige dans la même
session (🛠️ sur la carte), `IA_FIX_ATTEMPTS` fois max (2 par défaut, partagé avec la correction des
déploiements) ; au-delà, ⚠️ avec la sortie de la commande.

**Choix du modèle par carte** : une étiquette Trello `opus`, `sonnet`, `haiku` ou `fable` sur la carte
impose le modèle Claude pour ce ticket (cadrage et développement) ; la forme avancée `model:<id>` accepte
n'importe quel identifiant (ex. `model:claude-opus-4-6`). Priorité : étiquette > `ANTHROPIC_MODEL` > défaut du compte.
Une étiquette `effort:<niveau>` (`low`, `medium`, `high`, `xhigh`, `max`) règle de la même façon le niveau
d'effort — optionnelle et combinable avec l'étiquette de modèle ; sans elle, le défaut du CLI s'applique (`xhigh`).
En cas d'échec la carte reste dans « IA en cours » avec un commentaire ⚠️ ; la remettre dans « Ready IA » relance le ticket en reprenant sa session.

Prérequis sur la machine qui exécute le watcher :

- `claude` (Claude Code CLI) installé et connecté
- `gh` (GitHub CLI) authentifié avec le droit de push et de créer des PR
- les variables `TRELLO_*` du `.env` (clé/token via <https://trello.com/power-ups/admin>), les trois listes devant exister sur le board

### Déploiement sur Coolify (Docker)

Créer une ressource « Docker Compose » pointant sur ce dépôt : le `docker-compose.yml` à la racine construit
`docker/trello-ia/Dockerfile` (Node 22 + git + gh + claude) et lance `yarn watch-trello`.
Le volume `/data` persiste l'authentification et les sessions Claude (nécessaires à la reprise par ticket),
l'état des tickets (`ia-sessions.json`) et les worktrees.

Variables d'environnement à renseigner dans Coolify :

- `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID` (+ `TRELLO_LIST_*`, `TRELLO_POLL_MINUTES` si besoin)
- `GH_TOKEN` : token GitHub (fine-grained : Contents + Pull requests en read/write) — sert au push et aux PR
- `COOLIFY_API_URL` (ex. `https://coolify.example.com`), `COOLIFY_API_TOKEN` (Coolify → Keys & Tokens →
  API tokens, droits lecture + déploiement) et `COOLIFY_APP_UUID` (UUID de l'application dev, visible dans
  l'URL de l'application dans Coolify ou comme `COOLIFY_RESOURCE_UUID` dans ses logs de déploiement) :
  suivi des previews et auto-correction des déploiements échoués (optionnel, les trois ensemble)
- `GITHUB_REPO` : `owner/repo` du dépôt (le conteneur re-clone depuis GitHub, Coolify ne fournit pas `.git`)
- `CLAUDE_CODE_OAUTH_TOKEN` : **authentification Claude recommandée** — générer le token une fois sur ta machine
  avec `claude setup-token` (abonnement Claude), puis le coller dans Coolify. Aucune connexion interactive nécessaire.
  Alternatives : `ANTHROPIC_API_KEY` (facturation API), ou ouvrir le terminal du conteneur dans Coolify et lancer
  `claude /login` (la connexion est conservée dans le volume `/data`). La connexion ne se fait pas via les logs :
  logs = suivi du watcher, terminal Coolify = dépannage/login manuel.
