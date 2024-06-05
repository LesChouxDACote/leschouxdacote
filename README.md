# Les Choux d'à Côté

Classified food ads.
[leschouxdacote.fr](https://leschouxdacote.fr/)

## Requirements

- [Node](https://nodejs.org/) v10.13+
- [Yarn](https://yarnpkg.com/)

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
