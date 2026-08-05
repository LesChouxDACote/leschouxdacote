# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Les Choux d'à Côté" (leschouxdacote.fr) — a French marketplace for local food classified ads. Producers publish time-limited ads (annonces); buyers search them by location. UI text, routes, and domain vocabulary are in French (annonce = ad, producteur = producer, compte = account, recherche = search, connexion = login, inscription = signup).

## Commands

Requires Node >= 20 and Yarn 4 (`packageManager: yarn@4.5.1`).

- `yarn dev` — start Next.js dev server
- `yarn build` — production build
- `yarn serve` — serve production build
- `yarn lint` — runs lint-staged (tsc + ESLint/Prettier on **staged files only**; also runs on pre-commit via husky). To check the whole project: `yarn tsc --skipLibCheck --noEmit`
- `yarn env` — pull env vars from Vercel (or `cp example.env .env` and fill manually; see README for where keys live)
- Cron scripts (run by GitHub Actions, executable locally via ts-node + dotenv):
  - `yarn email-alerts` — email followers about products published in the last hour
  - `yarn email-expired` — email producers about expired ads
  - `yarn update-tags` — recompute tag counts in the Algolia tags index

There is no test suite.

## Architecture

Next.js 12 (pages router) + React 17 + TypeScript, styled with Emotion (plus some MUI components). SVGs in `src/assets/` import as React components via @svgr/webpack. Imports use the `src/...` prefix (tsconfig `baseUrl: "."`; ts-node scripts rely on tsconfig-paths).

### Dual data store: Firestore + Algolia

Firestore is the source of truth (`users` and `products` collections); Algolia is the search index. **Every product write must keep both in sync** — API routes write to Firestore and mirror to Algolia (`productsIndex.saveObject` / `deleteObject`, see `src/pages/api/publish.ts` and `product.ts`). A product only exists in Algolia while published; unpublishing deletes it from the index but keeps the Firestore doc. Documents use `objectID` (Algolia's convention) as their ID field everywhere in app code — `getObject()` in the firebase helpers converts a Firestore snapshot into a plain object with `objectID`, GeoPoints as `{lat, lng}`, and Timestamps as ms numbers.

### Client vs server code split

- `src/helpers/` — client-side only. `helpers/firebase.ts` uses the Firebase v8 browser SDK.
- `src/helpers-api/` — server-side only (API routes and scripts). `helpers-api/firebase.ts` uses firebase-admin. Never import it from client code.

### Auth

Client: Firebase Auth wrapped in `UserProvider` (`src/helpers/auth.tsx`), which subscribes to the Firestore user doc, exposes `useUser()`, and handles all role-based route redirects (roles: `PRODUCER`, `BUYER`, `ADMIN`; producer pages live under `/compte/producteur`, admin has `/csv-export`).

Server: API routes get the Firebase ID token from the `X-Token` header via `getToken()` (`helpers-api/firebase.ts`) and check ownership (`token.uid === product.uid`) themselves. The client wrapper `src/helpers/api.ts` attaches the token automatically to all `/api/*` calls.

API responses use `respond()`/`badRequest()` from `src/helpers-api/index.ts`. Field-level validation errors are returned as `{ errors: { field: message } }`, which the client api helper rethrows as `ValidationError` for form display.

### Data model

`src/types/model.d.ts` defines the domain types (`Product`, `Producer`, `Buyer`, etc.). Prices are in cents; `published`/`expires` are ms timestamps (`expires: null` = offline). Some fields are denormalized fan-out (e.g. `product.producer` is a copy of the producer's name, `followedProducers` copies name/address). Newer code validates with Effect schemas (`src/models/Product.ts`); some API routes also use `effect` for error handling. Ambient types like `ApiResponse` live in `src/types/*.d.ts` and need no import.

### Search & geodata

`src/pages/recherche.tsx` queries Algolia directly from the client with geo-radius options (`aroundLatLng` + `SEARCH_RADIUS` scoped by city/dpt/region/country) and a `bio` facet filter. Addresses are geocoded via Google Places (`placeId` on products); maps use Mapbox GL. Producer SIRET numbers are validated against the INSEE API.

### Rendering

Public product and producer pages (`annonce/[id]`, `producteur/[id]`) use ISR (`getStaticProps` with `ISR_REVALIDATE` = 60s, fallback paths). Search and account pages are client-rendered. Shared constants (colors, layout breakpoints, cache headers) are in `src/constants/index.ts`.

## Deployment

Vercel: commits to `develop` deploy to the dev environment, commits to `production` deploy to prod. PRs usually target `develop`. GitHub Actions cron workflows run the alert/expired/tags scripts and daily Firestore backups.
