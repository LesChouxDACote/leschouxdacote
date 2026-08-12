# Les Choux d'à Côté

Petites annonces alimentaires (producteurs locaux). Next.js 16 (pages router), TypeScript, déployé sur Vercel/Coolify.

## Stack

- Next.js 16 (`src/pages`, pas d'App Router) + React 19 + TypeScript (`strict: true`, target es2020).
- Style : Emotion (`@emotion/styled`), constantes partagées dans `src/constants`.
- Formulaires : `react-hook-form` + `yup` (schémas dans `src/helpers/yup.ts`).
- Données/validation runtime : `effect` (`Schema`) pour les modèles (ex. `src/models/Product.ts`).
- Backend : Firebase (auth + Firestore/RTDB), Algolia (recherche), Google Places, INSEE (API géo/entreprises), Mapbox, Bugsnag (monitoring).
- API routes Next.js dans `src/pages/api/*` pour les opérations serveur (publish, product, export, alerts, follow, user, view).

## Commandes

- `yarn dev` — dev local (nécessite `.env`, cf. `README.md`).
- `yarn lint` — lint-staged (ESLint + Prettier sur JS/JSX, `tsc --noEmit` + ESLint sur TS/TSX).
- `yarn build` — build Next.js (`BUILD_CPUS` limite les workers si besoin sur Coolify).
- `yarn serve` — sert le build de prod.
- `yarn email-alerts` / `yarn email-expired` / `yarn update-tags` — scripts `ts-node` ponctuels (`src/scripts/*.ts`).
- Vérification type : `yarn tsc --skipLibCheck --noEmit`.

## Style de code

- Pas de point-virgule (`semi: false`), `printWidth: 120` (Prettier).
- ESLint 9 en config flat (`eslint.config.mjs`) : `react/recommended`, `typescript-eslint/recommended` sur `.ts(x)`, `next/core-web-vitals`, `react-hooks/rules-of-hooks` en erreur.
- `@typescript-eslint/no-explicit-any` désactivé : `any` toléré si justifié, mais préférer un typage précis quand c'est simple.

## Structure `src/`

- `pages/` — routes Next.js (pages + `api/`) ; `pages/producteur`, `pages/compte`, `pages/annonce` regroupent les sous-routes par domaine.
- `components/` — composants React réutilisables.
- `cards/` — composants de type "carte" (affichage annonces/produits).
- `layout/` — mise en page globale (header, footer, wrappers).
- `helpers/` — utilitaires côté client (auth, dates, URL, validation, Algolia, Firebase, Bugsnag...).
- `helpers-api/` — utilitaires côté serveur (Firebase admin, Algolia, mail, CSV, upload d'images).
- `models/` — schémas de données (`effect/Schema`) partagés client/serveur.
- `types/` — types TypeScript globaux.
- `constants/` — constantes partagées (couleurs, breakpoints, etc.).
- `assets/` — SVG et médias (import direct via `@svgr/webpack`, cf. `next.config.js`).
- `scripts/` — scripts CLI (`ts-node`) pour tâches planifiées (alertes email, mise à jour de tags).

## Points de vigilance

- Le projet reste sur le **pages router** (`src/pages`) même en Next.js 16 : pas de fonctionnalités App Router, pas de Server Components.
- Firebase est utilisé en **SDK modulaire** (`firebase/*` côté client, `firebase-admin/*` côté serveur) ; les alias de types globaux sont dans `src/types/firebase.d.ts`.
- `src/helpers/algolia.ts` et `src/helpers-api/algolia.ts` exposent une couche `initIndex` qui émule l'API index de algoliasearch v4 sur le client v5 : les options de recherche s'étalent à la racine de la requête (`params` est réservé à la variante query string).
- formidable v3 renvoie **des tableaux** pour les champs comme pour les fichiers ; `getFormData` reprend la forme scalaire des champs, les fichiers restent indexés (`files.photo[0]`).
- Les schémas `effect/Schema` (ex. `ProductSchema`) sont la source de vérité pour la forme des données Firestore/Algolia ; les faire évoluer avec prudence (champs "fan-out" dénormalisés comme `producer`).
- `BUILD_CPUS` sert uniquement à limiter la RAM du build sur Coolify (dev) ; ne pas le rendre obligatoire ni le documenter comme requis en prod/Vercel.
- Secrets et clés (Firebase, Algolia, Mapbox, INSEE, Bugsnag) sont gérés via `.env` / Vaultwarden / GitHub Secrets — voir `README.md`, jamais à committer ni à documenter en clair ici.
- Avant de valider une modif TypeScript, lancer `yarn tsc --skipLibCheck --noEmit` (comme le fait `lint-staged` sur les fichiers `.ts(x)` en pre-commit).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
