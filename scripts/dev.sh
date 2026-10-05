#!/bin/sh
# Runs the application for a look in a browser, in the foreground, until killed: Kedalia's « Aperçu », and its agent
# looking at its own work. Kedalia starts it through `atelier-dev`, which sets the port (FRONTEND_PORT) and hands over
# the dev keys of the application's Coolify settings (Firebase, Algolia, Mapbox, Mailjet…): this is the dev project,
# with its real data. A developer can run it too, `next dev` reading `.env.local` by itself.
set -u
cd "$(dirname "$0")/.." || exit 1
# the repository's own yarn (yarnPath): Kedalia's image has Node 26, which ships no corepack
yarn=$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)
export HUSKY=0 NEXT_TELEMETRY_DISABLED=1
# Node 25+ dropped what firebase-admin's JWT library reads at load (scripts/node-slowbuffer.cjs)
export NODE_OPTIONS="${NODE_OPTIONS:-} --require $PWD/scripts/node-slowbuffer.cjs"
[ -d node_modules ] || node "$yarn" install --immutable || exit 1
# the links the pages build (sharing, sitemap): the run's own address unless one is given
export NEXT_PUBLIC_URL="${NEXT_PUBLIC_URL:-http://127.0.0.1:$FRONTEND_PORT}"
exec node "$yarn" next dev -H 127.0.0.1 -p "$FRONTEND_PORT"
