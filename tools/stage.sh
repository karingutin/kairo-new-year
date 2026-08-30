#!/usr/bin/env bash
# Stage the release. This is a COPY STEP, not a build — see CLAUDE.md and the
# migration design. It exists for exactly one reason: Wix serves the client
# directory verbatim, so the worker file and the credential inside it must live
# somewhere the client half cannot reach.
#
#   ./tools/stage.sh            stage the real upload worker
#   WORKER=worker/ping.js ./tools/stage.sh   stage a different one (Task 1)
set -euo pipefail
cd "$(dirname "$0")/.."

WORKER="${WORKER:-worker/poster-upload.js}"

rm -rf build
mkdir -p build/client build/server

# THE SERVED SITE, and this list is the contract. Anything the browser fetches
# at runtime must be named here; nothing else ships. lattice/ and shapes/ look
# like assets and are not — the lattice engine was ported into
# js/poster/28-lattice.js and its presets are never fetched, and the shape SVGs
# are reference drawings. The prototypes, docs/ and the .md files stay behind
# too: GitHub Pages published them only because it had no say in the matter.
cp index.html favicon.svg favicon.ico apple-touch-icon.png build/client/
cp -R css js build/client/

# THE WORKER, with its credentials substituted in. Non-Astro headless projects
# get no secrets manager, so the credential has to be inside the deployed file.
# build/ is gitignored, so it exists there and only between staging and release.
if [ ! -f .env ]; then
  echo "tools/stage.sh: no .env — copy .env.example and fill it in" >&2
  exit 1
fi
set -a; . ./.env; set +a
: "${WIX_CLIENT_ID:?WIX_CLIENT_ID is not set in .env}"
: "${WIX_CLIENT_SECRET:?WIX_CLIENT_SECRET is not set in .env}"

# THE NAME MATTERS: the runtime imports /user-code/entry.mjs, so the entry file
# has to be exactly that. Anything else deploys without error and then answers
# every request with "Cannot find module '/user-code/entry.mjs'" — which reads
# like a routing problem and is not one. Learned the hard way, 30 Aug.
sed -e "s|__WIX_CLIENT_ID__|${WIX_CLIENT_ID}|g" \
    -e "s|__WIX_CLIENT_SECRET__|${WIX_CLIENT_SECRET}|g" \
    "$WORKER" > build/server/entry.mjs

# A placeholder left unsubstituted means a worker that 401s on every call, and
# the failure would only show up as a dead QR. Catch it here instead.
if grep -q '__WIX_CLIENT_' build/server/entry.mjs; then
  echo "tools/stage.sh: a __WIX_CLIENT_*__ placeholder survived substitution" >&2
  exit 1
fi

echo "staged: $(du -sh build/client | cut -f1) client, worker from $WORKER"
