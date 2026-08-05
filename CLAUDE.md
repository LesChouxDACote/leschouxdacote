# Les Choux d'à Côté

Petites annonces alimentaires (producteurs locaux). Next.js 12 (pages router), TypeScript, déployé sur Vercel/Coolify.

## Stack

- Next.js 12 (`src/pages`, pas d'App Router) + React + TypeScript (`strict: true`, target es5).
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
- ESLint : `plugin:react/recommended`, `plugin:@typescript-eslint/recommended` sur `.ts(x)`, `react-hooks/rules-of-hooks` en erreur.
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

- Le projet cible **Next.js 12** : pas de fonctionnalités App Router, pas de Server Components.
- Les schémas `effect/Schema` (ex. `ProductSchema`) sont la source de vérité pour la forme des données Firestore/Algolia ; les faire évoluer avec prudence (champs "fan-out" dénormalisés comme `producer`).
- `BUILD_CPUS` sert uniquement à limiter la RAM du build sur Coolify (dev) ; ne pas le rendre obligatoire ni le documenter comme requis en prod/Vercel.
- Secrets et clés (Firebase, Algolia, Mapbox, INSEE, Bugsnag) sont gérés via `.env` / Vaultwarden / GitHub Secrets — voir `README.md`, jamais à committer ni à documenter en clair ici.
- Avant de valider une modif TypeScript, lancer `yarn tsc --skipLibCheck --noEmit` (comme le fait `lint-staged` sur les fichiers `.ts(x)` en pre-commit).
