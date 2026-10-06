# Tests end-to-end (Trello #238)

Suite Playwright couvrant les parcours principaux : consultation (accueil, recherche, fiche annonce, fiche producteur), authentification, publication d'annonce (producteur), réservations (acheteur + producteur), compte (profil, alertes).

## Architecture : paquet isolé

Les tests vivent dans un paquet séparé (`e2e/package.json`) avec leurs propres dépendances (`@playwright/test`), **sans toucher au `package.json`/`yarn.lock` racine**. En effet :

- le lockfile racine ne peut pas être régénéré sans réseau, et les workflows existants (`alerts.yml`, `expired.yml`…) installent avec `--frozen-lockfile` : y ajouter une dépendance casserait leur installation ;
- le `tsconfig` racine exclut `e2e`, qui a son propre `tsconfig.json` et n'est pas type-checké par le build Next.

Le build de l'application reste inchangé : Playwright lance `yarn serve` (build Next existant) via `webServer` et exécute les tests contre `http://localhost:3000`.

## Ordre d'exécution

`workers: 1`, `fullyParallel: false` et des projets ordonnés (Playwright lance les projets dans l'ordre de la liste du config) :

1. `consultation` — parcours anonymes
2. `authentification` — connexion/inscription/déconnexion/mot de passe oublié
3. `publication` — le producteur crée « [Test E2E] Panier de légumes de saison » (avec créneau + réservation), la modifie, la désactive/réactive
4. `reservations` — l'acheteur réserve, modifie, annule ; le producteur consulte ; l'annonce de test est supprimée en fin de parcours
5. `compte` — profil et alertes

Les suites `publication` et `reservations` sont `describe.serial` et partagent l'état via l'application elle-même : `publication` crée l'annonce, `reservations` la retrouve via « Mes annonces », la consomme et la supprime. Un test de nettoyage en tête de `publication` supprime une éventuelle annonce résiduelle d'une exécution précédente interrompue.

## Prérequis

1. `.env` racine avec les variables de l'environnement **develop** (cf. `example.env`, `README.md` racine) : les tests jouent sur de vraies données Firestore/Algolia de dev.
2. `e2e/.env` (non versionné, cf. `e2e/.env.example`) avec les comptes de test fournis par le PO :
   - `TEST_BUYER_EMAIL` / `TEST_BUYER_PASSWORD` (compte acheteur)
   - `TEST_PRODUCER_EMAIL` / `TEST_PRODUCER_PASSWORD` (compte producteur)
   - optionnel `E2E_BASE_URL` (ex. `https://develop.leschouxdacote.fr`) pour exécuter contre le dev au lieu du build local — dans ce cas le `webServer` local est désactivé et ni build ni `yarn serve` ne sont nécessaires.
3. Les comptes doivent exister côté Firebase **dev** (le producteur doit avoir le rôle producteur, pas simplement un compte auth).

## Commandes (depuis la racine)

```sh
yarn test:e2e            # build + install des deps e2e + navigateurs + tests
yarn test:e2e:headed     # idem, navigateur visible
yarn test:e2e:debug      # mode debug pas-à-pas
yarn test:e2e:report     # rapport HTML du dernier run (e2e/playwright-report)
```

Ou directement dans `e2e/` : `yarn install`, `yarn run install-browsers`, puis `yarn test`.

## Points de vigilance

- **Vraies données dev** : les tests créent/modifient/suppriment des documents Firestore réels et déclenchent de vrais e-mails (Mailjet) — notamment « mot de passe oublié » et notifications de réservation. N'utiliser que l'environnement de développement.
- **Sélecteurs sans `data-testid`** : l'application n'en comporte pas ; les tests s'appuient sur `input[name=…]`, les labels MUI (`getByLabel`), les rôles ARIA et des textes français. Attention aux apostrophes typographiques (U+2019) dans certains libellés (« Désactiver l’annonce », « Confirmez-vous l’annulation… ») contre des apostrophes droites ailleurs.
- **Dépendances réseau externes** : Google Places (adresse de l'annonce, champ « Où ? ») et Mapbox (carte). Les tests de recherche contournent Places via l'URL directe (`ll=…`), mais la création d'annonce dépend réellement de Places — des retries (2 en CI) sont configurés pour absorber la variabilité.
- **ISR** : les fiches annonces sont revalidées toutes les 60 s ; les tests attendent explicitement les textes concernés (timeout généreux).
- **Dialogues natifs** : l'application utilise `alert`/`confirm`, auto-acceptés par les tests via un handler qui collecte les messages pour les assertions.
- **Inscription** : les tests valident le formulaire côté client sans créer de compte (le ticket #238 ne prévoit pas de comptes jetables ; les comptes de test du PO sont préexistants).

## CI (GitHub Actions)

`.github/workflows/e2e.yml` : déclenché à chaque push sur `develop` (pas sur les pull requests, conformément au ticket) + `workflow_dispatch`. Jobs : build Next avec les variables de l'environnement dev, installation des navigateurs Playwright, exécution, upload du rapport HTML en artefact en cas d'échec.

Secrets GitHub à créer (en plus de ceux existants `FIREBASE_PROJECT_DEV`, `FIREBASE_EMAIL_DEV`, `FIREBASE_PRIVATE_KEY_DEV`, `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_INDEX_DEV`, `ALGOLIA_TAGS`, `MAILJET_PUBLIC_KEY`, `MAILJET_PRIVATE_KEY`, `INSEE_TOKEN`) :

| Secret                                                                                        | Variable injectée                |
| --------------------------------------------------------------------------------------------- | -------------------------------- |
| `FIREBASE_KEY_DEV`                                                                            | `NEXT_PUBLIC_FIREBASE_KEY`       |
| `FIREBASE_ID_DEV`                                                                             | `NEXT_PUBLIC_FIREBASE_ID`        |
| `FIREBASE_MEASURE_DEV`                                                                        | `NEXT_PUBLIC_FIREBASE_MEASURE`   |
| `FIREBASE_MESSAGING_DEV`                                                                      | `NEXT_PUBLIC_FIREBASE_MESSAGING` |
| `MAPBOX_TOKEN_DEV`                                                                            | `NEXT_PUBLIC_MAPBOX_TOKEN`       |
| `BUGSNAG_KEY_DEV`                                                                             | `NEXT_PUBLIC_BUGSNAG`            |
| `TEST_BUYER_EMAIL` / `TEST_BUYER_PASSWORD` / `TEST_PRODUCER_EMAIL` / `TEST_PRODUCER_PASSWORD` | comptes de test (e2e/.env)       |
