#!/bin/sh
# Kedalia's checks in one command, from the repository root: a frozen install, the typecheck and ESLint on src/ — what
# the pre-commit hook runs on staged files. No build: it prerenders every product from Firestore, so it needs the keys.
# Kedalia runs this before every delivery and reads the last line; `.github/workflows/kedalia.yml` runs it on each push.
cd "$(dirname "$0")/.." || exit 1
# The repository's own yarn (yarnPath): Kedalia's image has Node 26, which ships no corepack. HUSKY=0: no hook to
# install in a checkout whose git metadata lives elsewhere.
yarn() { node "$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)" "$@"; }
export HUSKY=0 NEXT_TELEMETRY_DISABLED=1 NO_COLOR=1 FORCE_COLOR=0
log=$(mktemp)
status=0

echo "== yarn install --immutable && tsc --noEmit && eslint src"
{ yarn install --immutable && yarn tsc --skipLibCheck --noEmit && yarn eslint src; } >"$log" 2>&1 || status=1
# yarn's progress and peer-dependency notes are dropped; errors stay (the output is read by an agent)
grep -vE '^➤ YN0000|YN0002|YN0007|YN0008|YN0060|YN0086|^\s*$' "$log" | tail -80

rm -f "$log"
if [ $status -eq 0 ]; then echo "== all checks passed"; else echo "== CHECKS FAILED: fix the errors above"; fi
exit $status
