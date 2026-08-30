# Wix Headless Migration + Poster QR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the site off GitHub Pages onto Wix-managed headless, and add a poster upload whose permanent URL is drawn as a QR beside the finished poster.

**Architecture:** The static site ships unchanged; a copy step stages it into `build/client` alongside a single Cloudflare Worker in `build/server`. The Worker's only job is to mint a signed Wix Media upload URL — the poster's bytes go from the browser straight to Wix and never pass through it. The browser then draws a QR of the returned permanent URL as SVG rects snapped to the `--cell` grid.

**Tech Stack:** Vanilla ES5-flavoured browser JS (classic scripts, one global scope, no modules, no bundler). One Cloudflare Worker, plain ESM, zero dependencies. Wix CLI (`npx wix preview` / `npx wix release`). Bash for the stage step.

**Spec:** [docs/superpowers/specs/2026-08-30-wix-headless-migration-design.md](../specs/2026-08-30-wix-headless-migration-design.md) — read it before Task 1.

## Global Constraints

- **No build tooling, ever.** `tools/stage.sh` may only copy files and substitute two credential placeholders. If it ever needs to transform a file the browser could have read directly, stop and raise it — the buildless claim is the project's architecture, not a preference.
- **No npm dependencies.** No `package.json` is added back. The Worker uses `fetch` and nothing else. The QR encoder is a vendored file, not an install.
- **Everything that is not poster artwork sits on the `--cell` grid.** Position *and* size land on grid lines, snapped against `gridOrigin()`'s phase, sizes written as `N * cell`, assigned **unrounded**, and re-snapped on resize and format change. See `placeChrome()` at [js/ui/40-dots.js:257](../../../js/ui/40-dots.js) for the reference implementation, and `CLAUDE.md`.
- **Script order is execution order.** New files get a numeric prefix and a `<script src>` tag in `index.html` at the matching position. No `defer`, no `async`, no modules.
- **The upload is best-effort.** Nothing in it may block, delay, or throw into `showFinish()`. A visitor whose upload fails still gets their poster, their download, and their ending.
- **British spelling** in comments and any user-visible copy, matching the codebase.
- **Comments explain why, at the density of the surrounding code.** This codebase comments heavily and argumentatively. Match it; do not write sparse code into it.
- Node.js **v20.11.0 or higher** is required by the Wix CLI.
- Never commit `.env` or `build/`.

## On testing

**This project has no test framework, no test runner, and no `package.json`.** Do not add one. Verification in every task below is concrete and manual: `curl` against a deployed preview URL, or the browser with its console open. Each task names exactly what to run and exactly what to expect.

Where a task says "open the site", use the Browser pane tools (`preview_start` with a `url`, then `read_console_messages`, `read_page`, `computer`) rather than asking a human to look.

## A note on human-only steps

Three steps cannot be done by an agent and are marked **HUMAN** where they appear:
- the Wix device-code login (Task 1)
- retrieving the client secret if `wix env pull` is unavailable (Task 2)
- turning GitHub Pages off or repointing it (Task 6)

Stop at those and hand back.

---

## File Structure

| file | responsibility |
|---|---|
| `worker/poster-upload.js` *(new)* | The Worker. Token exchange, `generate-upload-url`, request guards. Never sees poster bytes. |
| `tools/stage.sh` *(new)* | Copies the served site into `build/client`, the Worker into `build/server` with credentials substituted. |
| `js/vendor/qrcodegen.js` *(new)* | Vendored MIT QR encoder, byte-for-byte upstream. Never edited. |
| `js/app/64-share.js` *(new)* | Upload call, readiness wait, QR geometry, teardown. The whole feature's browser half. |
| `js/app/70-collect.js` *(modify)* | `rasterBlob()` split out of `exportRaster()`. |
| `js/app/51-flow.js` *(modify)* | `showFinish()` starts the upload; `hideFinish()` tears it down. |
| `js/app/55-reset.js` *(modify)* | Same teardown on reset. |
| `js/app/61-relayout.js` *(modify)* | Re-snap the QR on resize and format change. |
| `css/10-chrome.css` *(modify)* | `#qr` panel rules. |
| `index.html` *(modify)* | `#qr` element, two `<script>` tags. |
| `wix.config.json` *(new)* | Written by the Wix skill; `outputDirectory` corrected by hand. |
| `.env.example` *(new)* | Names the two variables. `.env` itself is gitignored. |
| `DEPLOY.md` *(rewrite)* | The Wix flow, replacing the GitHub Pages one. |

---

## Task 1: Connect to Wix and prove the routing precedence

**This task is a decision gate.** The spec's section 9 names one unknown: whether Wix serves a static file first and falls through to the Worker, or hands the Worker every request. If it is the latter, Task 2's Worker grows a static-asset branch. Nothing after this task is built until the answer is in hand.

**Files:**
- Create: `worker/ping.js` (throwaway, deleted in Task 2)
- Create: `tools/stage.sh`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `wix.config.json` (the Wix skill writes it first)

**Interfaces:**
- Consumes: nothing.
- Produces: a linked Wix project with `wix.config.json` carrying `appId` and `siteId`; a working `tools/stage.sh`; a recorded answer to the routing question.

- [ ] **Step 1: Check Node**

```bash
node -v
```

Expected: `v20.11.0` or higher. If lower, stop and tell the user to upgrade — the Wix CLI will not run.

- [ ] **Step 2: Bootstrap and log in — HUMAN**

```bash
curl -fsSL -O https://www.wix.com/skills/headless/entry/bootstrap.mjs && node bootstrap.mjs
```

The script emits JSON events one per line. Watch for:
- `cli_ok` → continue
- `awaiting_user` → **show the verification URL and code to the user and wait.** They must enter it in a browser; you cannot.
- `logged_in` / `success` → continue
- `cli_unreachable` / `login_failed` → stop and relay the error detail verbatim

- [ ] **Step 3: Install the Wix skills package and connect this repo**

```bash
CI=1 npx skills@latest add wix/skills --yes
```

Then open and follow `wix-headless/SKILL.md`, choosing **connect** (not create) against this repo. It writes `wix.config.json`.

Do not let it scaffold a framework, add a `package.json`, or restructure anything. If it tries, stop and report — this repo is buildless by design and that is a Global Constraint. Delete `bootstrap.mjs` when the skill is done.

- [ ] **Step 4: Correct `outputDirectory` by hand**

The skill defaults to `"./dist"` or `"."`. Both are wrong here. Edit `wix.config.json` so `site.outputDirectory` is the two-path object:

```json
{
  "projectType": "Site",
  "appId": "<left as the skill wrote it>",
  "siteId": "<left as the skill wrote it>",
  "site": {
    "outputDirectory": { "client": "./build/client", "server": "./build/server" }
  }
}
```

`"client": "."` would publish `worker/` — credential and all — at a public URL. That is the whole reason `build/` exists.

- [ ] **Step 5: Write the throwaway ping Worker**

Create `worker/ping.js`. This exists only to answer the routing question and is deleted in Task 2.

```js
/* THROWAWAY. Task 1 of the migration plan only: it answers one question —
   does Wix serve a static file first and fall through to the Worker, or does
   the Worker get every request? Deleted in Task 2 either way. */
export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    return new Response(
      JSON.stringify({ worker: true, pathname }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

Note it answers on **every** path deliberately. If `/` returns this JSON instead of the poster site, the Worker is receiving everything.

- [ ] **Step 6: Write `tools/stage.sh`**

Create `tools/stage.sh`:

```bash
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

sed -e "s|__WIX_CLIENT_ID__|${WIX_CLIENT_ID}|g" \
    -e "s|__WIX_CLIENT_SECRET__|${WIX_CLIENT_SECRET}|g" \
    "$WORKER" > build/server/index.js

# A placeholder left unsubstituted means a worker that 401s on every call, and
# the failure would only show up as a dead QR. Catch it here instead.
if grep -q '__WIX_CLIENT_' build/server/index.js; then
  echo "tools/stage.sh: a __WIX_CLIENT_*__ placeholder survived substitution" >&2
  exit 1
fi

echo "staged: $(du -sh build/client | cut -f1) client, worker from $WORKER"
```

Then:

```bash
chmod +x tools/stage.sh
```

- [ ] **Step 7: Write `.env.example` and update `.gitignore`**

Create `.env.example`:

```bash
# Credentials for the poster-upload Worker. Copy to .env and fill in.
# .env is gitignored and must stay that way: these two lines are the whole of
# this project's server-side security.
#
# Get them with `npx wix env pull`, which writes both. If that command is not
# available on this project type, the client ID is the `appId` in
# wix.config.json, and the secret is generated once in the dashboard under
# Settings > Development & integrations > Headless Settings.
WIX_CLIENT_ID=
WIX_CLIENT_SECRET=
```

Append to `.gitignore`:

```gitignore
# The staged release. Rebuilt by tools/stage.sh on every deploy, and the worker
# inside it carries the client secret substituted in — this must never be
# tracked.
build/

# The two credentials tools/stage.sh substitutes. See .env.example.
.env
```

- [ ] **Step 8: Stage with the ping worker**

The real credentials do not exist yet, so use throwaway values — the ping worker never reads them.

```bash
printf 'WIX_CLIENT_ID=placeholder\nWIX_CLIENT_SECRET=placeholder\n' > .env
WORKER=worker/ping.js ./tools/stage.sh
```

Expected: a `staged: … client, worker from worker/ping.js` line.

Then confirm the staged tree is exactly what the contract says:

```bash
find build -type f | sort
```

Expected: `build/server/index.js`, `build/client/index.html`, the three icons, and everything under `build/client/css/` and `build/client/js/`. **No `lattice/`, no `shapes/`, no `.md` files, no `docs/`, no `netlify*`, no prototype HTML.**

- [ ] **Step 9: Release to a preview URL and answer the question**

```bash
npx wix preview
```

Note the preview URL it prints. Then, against that URL:

```bash
curl -s "<PREVIEW_URL>/api/ping"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "<PREVIEW_URL>/"
```

Three possible outcomes — **record which one in the commit message**:

1. `/api/ping` returns `{"worker":true,...}` **and** `/` returns `200 text/html` → static wins, Worker is the fallback. This is the assumption the plan is written on. Continue to Task 2 unchanged.
2. `/api/ping` returns the JSON **and** `/` returns the JSON too → the Worker gets everything. **Stop.** Task 2's Worker must also serve the static assets, which is a different shape than this plan specifies. Report back before writing it.
3. `/api/ping` 404s → the server half is not being deployed or is not named as expected. Try `build/server/worker.js` and `build/server/_worker.js` as the entry filename (edit the `sed` output path in `tools/stage.sh`), re-stage, re-preview. If none work, report back.

- [ ] **Step 10: Open the preview and confirm the site itself is intact**

Use `preview_start` with the preview URL, then check:
- `read_console_messages` with `onlyErrors: true` → expected: **empty**. Any 404 here means the stage list in `tools/stage.sh` is missing a file the browser wants.
- `read_page` → the landing dialog is present.
- Click through to the board and confirm the poster draws.

The most likely failure is a missing asset that worked locally because the whole repo was sitting there. That is exactly the failure mode `tools/stage.sh`'s comment warns about.

- [ ] **Step 11: Commit**

```bash
git add wix.config.json tools/stage.sh .env.example .gitignore worker/ping.js
git commit -m "Connect the repo to Wix Headless, and stage rather than serve the root

tools/stage.sh copies the served site into build/client and the worker into
build/server. The client output cannot be the repo root: Wix serves it
verbatim, so worker/ and the credential inside it would be published.

Staging also means what ships is chosen. lattice/, shapes/, docs/, the .md
files and the prototypes stay behind; Pages published them only because it
had no say in the matter.

Routing precedence: <outcome 1, 2 or 3 from step 9, in one sentence>."
```

---

## Task 2: The upload Worker

**Files:**
- Create: `worker/poster-upload.js`
- Delete: `worker/ping.js`

**Interfaces:**
- Consumes: `tools/stage.sh` from Task 1, and its `__WIX_CLIENT_ID__` / `__WIX_CLIENT_SECRET__` placeholders.
- Produces: `POST /api/poster-upload` taking `{"size": <number>}` and returning `{"uploadUrl": "<string>"}`. Task 4's browser code calls exactly this.

- [ ] **Step 1: Get the credentials — HUMAN if `env pull` is unavailable**

Try the CLI first:

```bash
npx wix env pull
```

If it writes `WIX_CLIENT_ID` and `WIX_CLIENT_SECRET`, copy both into `.env` (replacing the `placeholder` values from Task 1) and continue.

If the command does not exist on this project type — the docs are inconsistent about whether it is available outside the Astro lane — hand back to the user with these instructions:

> In the project dashboard, go to **Settings → Development & integrations → Headless Settings**. Next to the client, open the more-actions menu, and under **Client info → Client secret** click **Generate Client Secret**. Copy it immediately — Wix shows it exactly once. The client ID is the `appId` already in `wix.config.json`.

Put both in `.env`. Confirm `.env` is ignored:

```bash
git check-ignore -v .env
```

Expected: a line naming `.gitignore`. If it prints nothing, **stop** — the secret is about to be committed.

- [ ] **Step 2: Write the Worker**

Create `worker/poster-upload.js`:

```js
/* =====================================================================
   The poster upload, server half.

   ONE ROUTE, and it does one thing: hand the browser a signed URL it can
   PUT a poster to. The poster's bytes never come through here. That is the
   whole point of this shape — the Netlify draft this replaces streamed
   every byte of every PNG through a function and into a blob store the
   function then had to read back out of, and none of that work bought
   anything Wix's own media CDN does not already do.

   The credentials are substituted in by tools/stage.sh at stage time. They
   are placeholders in the source on purpose: this file is committed, the
   staged copy under build/ is not. Non-Astro headless projects get no
   secrets manager, so this is the arrangement available.

   Cloudflare Workers runtime. Plain ESM, no dependencies, no bundling.
   ===================================================================== */

const CLIENT_ID     = '__WIX_CLIENT_ID__';
const CLIENT_SECRET = '__WIX_CLIENT_SECRET__';

const TOKEN_URL  = 'https://www.wixapis.com/oauth2/token';
const UPLOAD_URL = 'https://www.wixapis.com/site-media/v1/files/generate-upload-url';

/* The route is public and unauthenticated — it has to be, the visitors who
   press Create are anonymous. So the only thing it accepts is a byte count,
   and one outside this band is refused before any Wix call is made. A KAIRO
   poster at scale 2.6 lands in the low megabytes; the band is generous
   around that rather than tight to it. */
const MIN_BYTES = 1024;
const MAX_BYTES = 25 * 1024 * 1024;

/* Tokens last four hours. Cached per isolate — an isolate that outlives the
   token simply mints another, and there is nothing to invalidate because the
   cache cannot outlive the isolate holding it. */
let cached = null;   // { token, expiresAt }

async function accessToken(force) {
  if (!force && cached && cached.expiresAt > Date.now() + 60000) return cached.token;

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });
  if (!r.ok) throw new Error('token exchange failed: ' + r.status);

  const j = await r.json();
  /* expires_in is seconds, 14400 of them. The 60s margin above is what keeps
     a token from expiring between the check and the call that uses it. */
  cached = { token: j.access_token, expiresAt: Date.now() + (j.expires_in || 14400) * 1000 };
  return cached.token;
}

const json = (body, status) => new Response(JSON.stringify(body), {
  status: status || 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

/* No CORS headers anywhere in this file, and their absence is deliberate.
   The Netlify draft opened Access-Control-Allow-Origin to * because the
   builder lived on GitHub Pages and the function did not. Client and worker
   are one origin now, so the browser calls this with a relative path and
   there is no preflight to answer. */
export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== '/api/poster-upload') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    let size;
    try {
      const body = await request.json();
      size = body && body.size;
    } catch (e) {
      return json({ error: 'bad request' }, 400);
    }
    if (typeof size !== 'number' || !isFinite(size) || size < MIN_BYTES || size > MAX_BYTES) {
      return json({ error: 'bad size' }, 400);
    }

    /* The name is the only thing a visitor could otherwise influence, so it is
       not taken from the request at all — it is generated here. */
    const fileName = 'kairo-' + Date.now().toString(36) + '-'
                   + Math.random().toString(36).slice(2, 8) + '.png';

    try {
      let r = await mint(await accessToken(false), fileName, size);
      /* One retry on 401 and one only: a cached token that expired early is
         the one failure worth spending a second round trip on. */
      if (r.status === 401) r = await mint(await accessToken(true), fileName, size);

      if (!r.ok) {
        console.log('generate-upload-url failed', r.status, await r.text());
        return json({ error: 'upstream' }, 502);
      }
      const j = await r.json();
      if (!j.uploadUrl) return json({ error: 'upstream' }, 502);

      /* Nothing but the URL goes back. Not the token, not the file id, not an
         echo of anything the caller sent. */
      return json({ uploadUrl: j.uploadUrl });
    } catch (e) {
      console.log('poster-upload error', e && e.message);
      return json({ error: 'upstream' }, 502);
    }
  }
};

function mint(token, fileName, size) {
  return fetch(UPLOAD_URL, {
    method: 'POST',
    /* Wix takes the raw token here. NOT 'Bearer ' + token — the prefix makes
       this 401, which is a slow half-hour to debug. */
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mimeType: 'image/png',
      fileName: fileName,
      sizeInBytes: String(size),
      private: false          // a private file's url returns 403, and a QR of a 403 is a dead QR
    })
  });
}
```

- [ ] **Step 3: Delete the throwaway and stage**

```bash
rm worker/ping.js
./tools/stage.sh
```

Expected: `staged: … worker from worker/poster-upload.js`, and no placeholder-survived error.

- [ ] **Step 4: Release to preview and verify the happy path**

```bash
npx wix preview
```

Against the new preview URL:

```bash
curl -s -X POST "<PREVIEW_URL>/api/poster-upload" \
  -H 'Content-Type: application/json' -d '{"size":204800}'
```

Expected: `{"uploadUrl":"https://..."}`. If it returns `{"error":"upstream"}`, the credentials or the permission are wrong — run `npx wix preview` again after checking `.env`, and read the Worker's `console.log` output.

- [ ] **Step 5: Verify the guards**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST "<PREVIEW_URL>/api/poster-upload" -H 'Content-Type: application/json' -d '{"size":10}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST "<PREVIEW_URL>/api/poster-upload" -H 'Content-Type: application/json' -d '{"size":"big"}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST "<PREVIEW_URL>/api/poster-upload" -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -w '%{http_code}\n' "<PREVIEW_URL>/api/poster-upload"
curl -s -o /dev/null -w '%{http_code}\n' "<PREVIEW_URL>/api/nope"
```

Expected, in order: `400`, `400`, `400`, `405`, `404`.

- [ ] **Step 6: Verify the whole round trip with a real PNG**

This is the step that proves the browser half will work — in particular that a cross-origin `PUT` to the signed URL is allowed.

```bash
UPLOAD=$(curl -s -X POST "<PREVIEW_URL>/api/poster-upload" \
  -H 'Content-Type: application/json' -d '{"size":'"$(wc -c < apple-touch-icon.png)"'}' \
  | sed 's/.*"uploadUrl":"//;s/".*//')
curl -s -X PUT "$UPLOAD" -H 'Content-Type: image/png' --data-binary @apple-touch-icon.png
```

Expected: a JSON body containing `"file"` with a `"url"` on `static.wixstatic.com` and `"operationStatus"`. Fetch that URL and confirm it returns the PNG:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "<THE_FILE_URL>"
```

Expected: `200 image/png`.

**If the PUT is rejected for CORS when the browser tries it in Task 4** — `curl` will not show this, since curl ignores CORS — the fallback is to proxy the bytes through the Worker after all, which is the Netlify shape and costs the design its main advantage. Note it and report back rather than improvising.

- [ ] **Step 7: Commit**

```bash
git add worker/poster-upload.js
git rm --cached worker/ping.js 2>/dev/null; true
git add -A worker
git commit -m "The poster upload's server half: one route, no bytes

POST /api/poster-upload takes a byte count and returns a signed Wix Media
upload URL. The poster itself goes from the browser straight to Wix and never
passes through the worker, which is what this shape buys over the Netlify
draft it replaces.

Credentials are placeholders in the source and substituted by tools/stage.sh,
since non-Astro headless projects get no secrets manager. No CORS headers:
client and worker are one origin now."
```

---

## Task 3: Split `rasterBlob()` out of `exportRaster()`

Independent of Tasks 1 and 2 — it touches no Wix anything. It exists so the poster that gets uploaded and the poster that gets downloaded are the same bytes by construction rather than by two code paths agreeing.

**Files:**
- Modify: `js/app/70-collect.js` (the `exportRaster` function, currently at line 181)

**Interfaces:**
- Consumes: `buildSVG()`, `box()`, `RECORD_ROWS` — all existing globals.
- Produces: `async function rasterBlob(kind)` returning a `Blob` (`kind` is `'png'` or `'jpg'`), or throwing. Task 4 calls `rasterBlob('png')`.

- [ ] **Step 1: Read the function you are about to change**

Read `js/app/70-collect.js` from the `/* ONE RASTERISER FOR BOTH` comment to the end of the file. Note especially the canvas height: `B.h + RECORD_ROWS * (B.w / B.cols)`, which exists because the record band is part of the sheet and not part of the artwork's box. That arithmetic moves into `rasterBlob()` unchanged — **do not re-derive it.**

- [ ] **Step 2: Replace `exportRaster` with the split pair**

Replace the whole `async function exportRaster(kind,btn){ ... }` body with:

```js
/* THE RASTERISER, and it is separate from the saving on purpose: the QR beside
   the finished poster points at an upload of these exact bytes (see
   js/app/64-share.js), and "exact" has to be structural. Two code paths that
   both happen to rasterise correctly would drift the first time one of them
   was touched. */
async function rasterBlob(kind){
  const svg=buildSVG();
  const img=new Image(), scale=2.6;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src=url; });
    const c=document.createElement('canvas');
    const B=box();                       // the current format's own pixel box
    /* ...plus the record's two rows, which are part of the sheet and not part of
       the artwork's box. Sizing the canvas off B alone would crop the band off
       the bottom of every PNG and JPEG while the SVG kept it. */
    c.width=B.w*scale; c.height=(B.h+RECORD_ROWS*(B.w/B.cols))*scale;
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const jpg=kind==='jpg';
    return await new Promise((res,rej)=>{
      c.toBlob(b=>b?res(b):rej(new Error('toBlob gave nothing')),
               jpg?'image/jpeg':'image/png', jpg?0.92:undefined);
    });
  } finally { URL.revokeObjectURL(url); }
}

/* ...and the saving, which is now the thin half. The button it was pressed
   from is PASSED IN rather than looked up. It used to read
   getElementById('dlPng'), which tied the export to one particular button in
   one particular card — and that card is gone. Anything that can be pressed
   can hand itself over; nothing has to, and a call with no button simply
   exports without saying so on screen.
   JPEG carries no alpha, but the sheet's first mark is an opaque ground rect
   the width and height of the poster (see buildSVG), so there is no
   transparency to lose and no white to paint in underneath. */
async function exportRaster(kind,btn){
  const old=btn?btn.textContent:'';
  if(btn){ btn.textContent='Saving…'; btn.disabled=true; }
  try{ download(await rasterBlob(kind), fileBase()+'.'+kind); }
  catch(e){ exportSVG(); }
  finally{ if(btn){ btn.textContent=old; btn.disabled=false; } }
}
```

Note two behaviour-preserving details: the SVG fallback on any failure is kept, and `URL.revokeObjectURL` now runs in a `finally` so a failed `img.onload` no longer leaks the object URL — which the old code did.

- [ ] **Step 3: Verify both exports still work**

Open the site locally with the Browser pane, answer through to Create, then in the console:

```js
(await rasterBlob('png')).size
```

Expected: a number in the hundreds of thousands to low millions, and `(await rasterBlob('png')).type` is `'image/png'`.

Then press the PNG and JPG save buttons in the finished card and confirm both files download and open. Check `read_console_messages` with `onlyErrors: true` → expected: empty.

- [ ] **Step 4: Commit**

```bash
git add js/app/70-collect.js
git commit -m "Split rasterBlob() out of exportRaster()

The QR beside the finished poster will point at an upload of these exact
bytes, so the rasterising and the saving stop being one function. Behaviour
is unchanged, except that the object URL is now revoked in a finally — a
failed decode used to leak it."
```

---

## Task 4: The upload path

The QR is not drawn yet. This task ends with the permanent URL in the console, proven end to end from a real browser.

**Files:**
- Create: `js/app/64-share.js`
- Modify: `index.html` (one `<script>` tag)
- Modify: `js/app/51-flow.js` (`showFinish`, `hideFinish`)
- Modify: `js/app/55-reset.js`

**Interfaces:**
- Consumes: `rasterBlob('png')` from Task 3; `POST /api/poster-upload` → `{uploadUrl}` from Task 2; existing globals `S`, `posterDone`.
- Produces: `startShare()`, `clearShare()`, and the module-level state `SHARE` — `{ status, url, sig }` where `status` is one of `'idle' | 'working' | 'ready' | 'failed'`. Task 5 reads `SHARE` and calls `renderQR()`.

- [ ] **Step 1: Create `js/app/64-share.js`**

```js
/* =====================================================================
   The share — the poster's permanent address, and the QR of it.

   At the Create press the finished sheet is rasterised, uploaded, and its
   permanent Wix Media URL drawn as a QR beside the poster, for whoever made
   it to take away with a phone.

   BEST-EFFORT, AND NOTHING WAITS ON IT. This is the one hard rule of the
   feature: showFinish() starts this and does not await it, no step here can
   throw into the ending, and a visitor whose upload fails still gets their
   poster, their download and their ending exactly as before. Every path out
   of here ends in a status, never in an exception.

   The QR's geometry lives in this file too, and it is chrome, so it sits on
   the --cell grid like everything else that is not the artwork.
   ===================================================================== */

const SHARE = { status:'idle', url:null, sig:null };

/* The upload is keyed on the same things that make a poster a different
   poster — the answers, the rolls and the format. Backing out of the ending
   and pressing Create again on an unchanged session should not spend a second
   upload, and it does not. */
function shareSig(){
  try{
    return JSON.stringify([S.seed, S.format, S.rolls,
      ASKED.map(q=>isSkipped(q.id)?null:ans(q.id))]);
  }catch(e){ return String(S.seed)+'|'+S.format; }
}

async function startShare(){
  const sig=shareSig();
  /* already have this exact poster's address, or already fetching it */
  if(SHARE.sig===sig && (SHARE.status==='working'||SHARE.status==='ready')) return;

  SHARE.sig=sig; SHARE.status='working'; SHARE.url=null;
  renderQR();

  try{
    const blob=await rasterBlob('png');

    const r=await fetch('/api/poster-upload',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({size:blob.size})
    });
    if(!r.ok) throw new Error('mint '+r.status);
    const {uploadUrl}=await r.json();
    if(!uploadUrl) throw new Error('no uploadUrl');

    /* PUT, not POST — the signed URL takes a PUT with the bytes as the body.
       The poster goes straight to Wix from here; the worker never sees it. */
    const up=await fetch(uploadUrl,{
      method:'PUT', headers:{'Content-Type':'image/png'}, body:blob
    });
    if(!up.ok) throw new Error('put '+up.status);
    const out=await up.json();
    const url=out && out.file && out.file.url;
    if(!url) throw new Error('no file url');

    /* Wix is explicit that a successful upload response does not mean the file
       is readable yet, so the address is not trusted until it actually loads.
       A QR that resolves to nothing is worse than no QR. */
    await settle(url);

    /* the session moved on while we were away — that poster is not this one */
    if(SHARE.sig!==sig) return;
    SHARE.status='ready'; SHARE.url=url;
    console.log('[kairo] poster at', url);
  }catch(e){
    if(SHARE.sig!==sig) return;
    SHARE.status='failed'; SHARE.url=null;
    console.warn('[kairo] share failed:', e && e.message);
  }
  renderQR();
}

/* Wait for the address to actually serve an image. Six tries over about
   twelve seconds, backing off — past that it is not coming and the panel
   says so rather than spinning forever. */
function settle(url){
  return new Promise((res,rej)=>{
    let n=0;
    (function tryOnce(){
      const img=new Image();
      img.onload=()=>res();
      img.onerror=()=>{
        if(++n>=6) return rej(new Error('never became readable'));
        setTimeout(tryOnce, 400*Math.pow(1.8,n));
      };
      img.src=url+(url.indexOf('?')<0?'?':'&')+'probe='+n;
    })();
  });
}

/* Backing out of the ending is backing out of a poster. The address of the
   one before it must not still be standing there when the next Create lands. */
function clearShare(){
  SHARE.status='idle'; SHARE.url=null; SHARE.sig=null;
  renderQR();
}

/* Task 5 replaces this with the real thing. Declared here so Task 4 stands on
   its own and startShare() has something to call. */
function renderQR(){}
```

- [ ] **Step 2: Add the script tag**

In `index.html`, immediately after the `js/app/63-record.js` line:

```html
<script src="js/app/64-share.js"></script>
```

`64-share.js` calls `rasterBlob()`, which is declared at 70 — later in the tag order. That is fine and it is worth knowing why: every file is parsed before any press happens, so a call made at the Create press resolves against a fully-populated global scope. The numeric prefixes govern *load-time* order, and nothing here runs at load time.

- [ ] **Step 3: Wire it into the ending**

In `js/app/51-flow.js`, in `showFinish()`, after the `renderSnake(); renderStatus(); submit('complete');` line, add:

```js
  /* The address for the QR. NOT AWAITED, and showFinish is not async: the
     ending is not allowed to wait on a network round trip, and a failed
     upload must cost the visitor nothing at all. See js/app/64-share.js. */
  startShare();
```

In `hideFinish()`, after the `unstampRecord();` line, add:

```js
  clearShare();                       // that poster's address is not this one's
```

- [ ] **Step 4: Tear down on reset too**

Read `js/app/55-reset.js` first. In `resetAll()`, alongside the other state that is cleared, add:

```js
  clearShare();
```

If `resetAll()` already routes through `hideFinish()`, confirm that by reading it — and if it does, add nothing here and note it in the commit message instead. A double `clearShare()` is harmless but the duplication is not worth it.

- [ ] **Step 5: Verify against the preview, not locally**

The `fetch('/api/poster-upload')` is relative, so it only resolves where the Worker is. Stage, preview, and open the preview URL:

```bash
./tools/stage.sh && npx wix preview
```

Open the preview URL with the Browser pane, answer through to Create, then watch `read_console_messages`.

Expected: `[kairo] poster at https://static.wixstatic.com/media/...` within a few seconds. Fetch that URL and confirm it is the poster.

Then check the guards by hand in the console:
- `SHARE.status` → `'ready'`
- press Back out of the ending, then `SHARE.status` → `'idle'`
- press Create again → exactly one new `[kairo] poster at` line, and the URL is the **same** as before (the signature is unchanged, so nothing re-uploaded)
- change the format, press Create → a **different** URL

- [ ] **Step 6: Verify the failure path costs nothing**

In the console on the preview, force a failure and confirm the ending is unharmed:

```js
const real = window.fetch;
window.fetch = (u, o) => String(u).includes('/api/poster-upload')
  ? Promise.resolve(new Response('{}', {status:502}))
  : real(u, o);
```

Back out, press Create again. Expected: the ending arrives normally, the sheet grows, the PNG and JPG buttons still save, `SHARE.status` is `'failed'`, and the console has a single `[kairo] share failed:` warning and no uncaught error. Restore with `window.fetch = real`.

- [ ] **Step 7: Commit**

```bash
git add js/app/64-share.js js/app/51-flow.js js/app/55-reset.js index.html
git commit -m "Upload the finished poster at the Create press

showFinish() starts it and does not await it. The bytes are rasterBlob's, so
the uploaded poster and the saved one are the same by construction; they go
from the browser straight to Wix by signed PUT. The address is not trusted
until it actually loads, since Wix is explicit that a successful upload
response does not mean the file is readable yet.

No QR yet — the URL goes to the console. Failure is quiet by design: the
ending, the download and the poster are untouched by it."
```

---

## Task 5: The QR on the grid

**Files:**
- Create: `js/vendor/qrcodegen.js`
- Modify: `js/app/64-share.js` (`renderQR()` replaces the stub)
- Modify: `index.html` (the `#qr` element, one `<script>` tag)
- Modify: `css/10-chrome.css`
- Modify: `js/app/61-relayout.js`

**Interfaces:**
- Consumes: `SHARE` from Task 4; `cellSize()` and `gridOrigin()` from `js/ui/40-dots.js`; the global `qrcodegen` from the vendored file.
- Produces: a working `renderQR()`, called by `startShare()`, `clearShare()` and on relayout.

- [ ] **Step 1: Vendor the encoder**

Download Nayuki's QR Code generator (MIT), JavaScript edition, into `js/vendor/qrcodegen.js`:

```bash
mkdir -p js/vendor
curl -fsSL -o js/vendor/qrcodegen.js \
  https://raw.githubusercontent.com/nayuki/QR-Code-generator/master/javascript/qrcodegen.js
```

Verify it is the classic-script build and exposes a global — it should contain `var qrcodegen` near the top and must **not** contain `export ` or `module.exports`:

```bash
head -5 js/vendor/qrcodegen.js && grep -c "^var qrcodegen" js/vendor/qrcodegen.js && grep -c "export \|module.exports" js/vendor/qrcodegen.js
```

Expected: an MIT licence header, `1`, and `0`. If the third number is not `0`, the repo has moved to a module build — find the classic `qrcodegen-vX.Y.Z-javascript.js` release asset instead. **Do not edit the file to make it fit.** It is vendored, and vendored means byte-for-byte upstream so it can be re-fetched without re-doing work.

- [ ] **Step 2: Add the markup and the script tag**

In `index.html`, beside the other corner chrome — immediately after the `<button type="button" id="reset" ...>` line:

```html
  <!-- The finished poster's address, for a phone. Placed and sized entirely
       from js/app/64-share.js, because like all the chrome it lands on grid
       lines and the grid is a function of the viewport. -->
  <div id="qr" aria-hidden="true"></div>
```

And with the other scripts, immediately **before** the `js/app/64-share.js` tag:

```html
<script src="js/vendor/qrcodegen.js"></script>
```

Before, not after: `renderQR()` reads `qrcodegen` at draw time rather than at load, so order is not strictly forced — but a vendored library that something else depends on reads wrong sitting below its consumer.

- [ ] **Step 3: Style the panel**

Append to `css/10-chrome.css`:

```css
/* ---------------------------------------------------------------------
   The share QR. Everything about its position and its size is set from
   js/app/64-share.js, because both have to land on grid lines and the grid
   is a function of the viewport — there is no px value here that could be
   right at two window sizes. What lives here is only what does not move:
   how it arrives, and what it looks like while it has nothing to show.

   THE SECOND PLACE THE FLIP IS NOT LITERAL (the first is --chrome-ink, and
   for a related reason). body.made inverts the palette, and the QR lives
   only inside body.made — so following --fg on --surface would draw every
   code light-on-dark. Plenty of phone cameras read an inverted code and
   plenty do not, and this is the one element on the page whose entire job is
   to be read by a machine on the first try. So it holds the light tones as
   literals: #141414 on #ECECEC, the same two values --fg and --surface carry
   before the flip. It is a small bright square in a dark ending, and that is
   the cost of it working.
   --------------------------------------------------------------------- */
#qr{
  position:fixed;
  display:none;
  z-index:6;
  opacity:0;
  transition:opacity var(--flip) var(--eo);
  pointer-events:none;
}
#qr.on{ display:block; opacity:1; }
#qr svg{ display:block; width:100%; height:100%; }

/* Working and failed both show the box and no code. The failed state says so
   quietly rather than in an error colour: a QR that did not arrive is not an
   error the visitor can do anything about, and the ending is not the place to
   shout about it. These two DO follow the flip — there is no scanner to
   satisfy, so they sit in the ending's own palette like any other text. */
#qr .msg{
  font:500 calc(var(--cell) * 0.30)/1.35 var(--ui);
  color:var(--dim);
  padding:calc(var(--cell) * 0.2);
}

@media (prefers-reduced-motion: reduce){
  #qr{ transition:none; }
}
```

The variables used here are all real and were checked: `--flip` (460ms) and `--eo` at [css/00-ground.css:116](../../../css/00-ground.css), `--dim`, `--ui` and `--cell` in the same `:root`. **There is no `--paper` in this codebase** — the two roles are `--fg` (interface ink) and `--surface` (what ink is set on), and `--ink` is the board's *ground*, not the mark. Do not reach for `--ink` here.

- [ ] **Step 4: Replace the `renderQR()` stub**

In `js/app/64-share.js`, replace `function renderQR(){}` with:

```js
/* ---------------------------------------------------------------------
   THE QR, ON THE GRID.

   The encoder is vendored and gives us a module matrix; the drawing is ours,
   as SVG rects, because a QR the library styles is a QR that ignores the
   --cell grid — and CLAUDE.md is not ambiguous about that. This is interface
   chrome, so its position AND its size land on grid lines, snapped against
   the grid's own phase rather than against the screen edge.

   The box is a whole number of cells square. One module is that box divided
   by the matrix plus its quiet zone, so the code breathes with the grid the
   way every other component's padding does.
   --------------------------------------------------------------------- */
const QR_CELLS=7;          // the box, in cells, square
const QR_QUIET=4;          // modules of quiet zone each side — 4 is the spec's minimum

function renderQR(){
  const el=document.getElementById('qr');
  if(!el) return;

  /* it belongs to the ending and to nothing else */
  if(!posterDone || SHARE.status==='idle'){ el.classList.remove('on'); el.innerHTML=''; return; }

  const cell=cellSize(), o=gridOrigin();
  const vw=window.innerWidth, vh=window.innerHeight;
  const phaseX=((o.x%cell)+cell)%cell;      // first vertical line at or after x=0
  const phaseY=((o.y%cell)+cell)%cell;      // first horizontal line at or after y=0
  const side=QR_CELLS*cell;

  /* bottom-right, one cell in from the last line each way. Assigned unrounded:
     rounding to whole pixels — or even to 2dp — pushes it off the line. */
  const lastX=phaseX+Math.floor((vw-phaseX)/cell)*cell;
  const lastY=phaseY+Math.floor((vh-phaseY)/cell)*cell;
  el.style.left=(lastX-side-cell)+'px';
  el.style.top =(lastY-side-cell)+'px';
  el.style.width=side+'px';
  el.style.height=side+'px';

  if(SHARE.status!=='ready' || !SHARE.url){
    el.innerHTML='<div class="msg">'+(SHARE.status==='failed'?'no link':'…')+'</div>';
    el.classList.add('on');
    return;
  }

  try{
    const qr=qrcodegen.QrCode.encodeText(SHARE.url, qrcodegen.QrCode.Ecc.MEDIUM);
    const n=qr.size, span=n+QR_QUIET*2, m=side/span;
    let d='';
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(qr.getModule(x,y))
      d+='M'+((x+QR_QUIET)*m)+' '+((y+QR_QUIET)*m)+'h'+m+'v'+m+'h'+(-m)+'z';
    /* one path rather than n^2 rects: a version-5 code is over a thousand
       dark modules and a thousand elements is a thousand elements */
    /* Literal tones, not var(--fg)/var(--surface): body.made has inverted both
       by the time this draws, and an inverted QR is one a fair share of phone
       cameras will not read. See the note in css/10-chrome.css. */
    el.innerHTML=
      '<svg viewBox="0 0 '+side+' '+side+'" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
      + '<rect width="'+side+'" height="'+side+'" fill="#ECECEC"/>'
      + '<path d="'+d+'" fill="#141414"/></svg>';
    el.classList.add('on');
  }catch(e){
    /* an encode that fails is a failed share like any other */
    el.innerHTML='<div class="msg">no link</div>';
    el.classList.add('on');
    console.warn('[kairo] qr encode failed:', e && e.message);
  }
}
```

- [ ] **Step 5: Re-snap on resize and format change**

`relayout()` at [js/app/61-relayout.js:2](../../../js/app/61-relayout.js) is the one function every resize and every format change runs through, and `placeChrome()` is already its third line. Add `renderQR()` to it, at the end, beside the other renderers:

```js
  renderDots(); renderStatus(); renderQR(); draw();
```

`--cell` is a function of the viewport alone, so a QR placed once at Create and never again drifts off the grid the moment the window changes — which is the specific failure `CLAUDE.md` warns about. `renderQR()` returns immediately unless `posterDone` is set, so calling it on every relayout costs nothing during the asking.

- [ ] **Step 6: Verify it is on the grid, and that it scans**

Stage, preview, open it, answer through to Create.

Visual check with `computer {action: "screenshot"}` — the QR is in the bottom-right, square, and its edges line up with the interface lattice.

Arithmetic check in the console — this is the real test, because "looks aligned" is not the standard:

```js
const c=cellSize(), o=gridOrigin(), q=document.getElementById('qr').getBoundingClientRect();
const px=((o.x%c)+c)%c, py=((o.y%c)+c)%c;
[ (q.left-px)/c, (q.top-py)/c, q.width/c, q.height/c ].map(v=>Math.abs(v-Math.round(v)))
```

Expected: four numbers, all below `0.001`. Position and size are both whole cell counts off the grid's phase. Anything larger means a rounding crept in.

Then:
- resize the window with `resize_window` (mobile, tablet, desktop) and re-run the arithmetic check after each → still all below `0.001`
- change the poster format and re-run it → still passes
- `read_console_messages` with `onlyErrors: true` → empty

Finally, **scan it with a phone** and confirm it opens the poster. This is the one check that cannot be automated and it is the one that matters; if a phone will not read it, raise `QR_CELLS` and try again.

- [ ] **Step 7: Commit**

```bash
git add js/vendor/qrcodegen.js js/app/64-share.js css/10-chrome.css index.html js/app/61-relayout.js
git commit -m "Draw the poster's address as a QR, on the grid

The encoder is vendored; the drawing is ours, as one SVG path, because a QR
the library styles is a QR that ignores --cell. Box and position are whole
cell counts snapped against the grid's phase and assigned unrounded, and both
re-snap on resize and format change like every other piece of chrome."
```

---

## Task 6: Retire Netlify, rewrite DEPLOY.md, release

**Files:**
- Delete: `netlify.toml`, `netlify/`, `netlify-publish/`, `package.json`
- Rewrite: `DEPLOY.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a live site on a `*.wix-site-host.com` URL.

- [ ] **Step 1: Delete the Netlify draft**

```bash
git rm -r --cached netlify netlify-publish 2>/dev/null; true
rm -rf netlify netlify-publish netlify.toml package.json
```

None of it was ever pushed or deployed. `package.json` goes with it — it existed only to name `@netlify/blobs`, and this project has no npm dependencies by design.

Confirm nothing references any of it:

```bash
grep -rni "netlify" --exclude-dir=.git --exclude-dir=build . | grep -v "^./docs/superpowers/"
```

Expected: no output. (The specs and this plan mention it as history; that is correct and stays.)

- [ ] **Step 2: Rewrite `DEPLOY.md`**

Read the existing file first — it describes a GitHub Pages flow and still names the older Archi-Time address, which was wrong before this migration. Replace it wholesale. It must cover:

- **the two commands**, and that they are always both: `./tools/stage.sh && npx wix release`
- that `wix release` **does not build** — it uploads whatever is in `build/`, so a release without a stage ships the previous stage
- that `npx wix preview` gives a per-version shareable URL, and that the upload path must be proven there before a release
- **the stage list in `tools/stage.sh` is the contract** — a new runtime asset that is not added to it works locally and 404s on the live site, because locally the whole repo is still sitting there
- `.env` holds `WIX_CLIENT_ID` and `WIX_CLIENT_SECRET`; `.env.example` names them; neither `.env` nor `build/` is ever committed
- that releasing clears the site cache, so a release is also the fix for stale content
- the live address, and that `karingutin.github.io/kairo-new-year/` is now a redirect stub
- that a custom domain needs a Wix premium plan and is deliberately not set up

- [ ] **Step 3: Release**

```bash
./tools/stage.sh && npx wix release
```

Note the published URL it prints.

- [ ] **Step 4: Verify the live site, end to end**

Against the published URL, not a preview:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "<LIVE_URL>/"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "<LIVE_URL>/api/poster-upload" -H 'Content-Type: application/json' -d '{"size":204800}'
```

Expected: `200 text/html` and `200`.

Then open it with the Browser pane and run a full session: answer every question through to Create, confirm the QR arrives, scan it with a phone, and save both the PNG and the JPG. `read_console_messages` with `onlyErrors: true` → empty.

- [ ] **Step 5: Point the old address at the new one — HUMAN**

Hand back to the user with the live URL. Turning GitHub Pages into a redirect stub means either replacing the repo's `index.html` with a meta-refresh — which would fight this repo's own contents — or serving the stub from a separate branch or repo. That is the user's call to make, and their account to make it in.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Retire the Netlify draft, and rewrite DEPLOY.md for Wix

netlify.toml, both functions, netlify-publish/ and the package.json that
existed only to name @netlify/blobs are all deleted. None of it was ever
pushed or deployed, and the Wix shape is different enough that porting it
would have been pretending otherwise.

DEPLOY.md is rewritten rather than amended: it described a GitHub Pages flow
and still named the older Archi-Time address, which was wrong before this."
```

- [ ] **Step 7: Ask about pushing**

Per `CLAUDE.md`, ask the user whether to push. Do not push unasked.

---

## Self-review notes

Checked against the spec, section by section:

- §1 (what moves) → Tasks 1 and 6.
- §2 (deploy shape, the `client: "."` trap, the stage list, `.env`) → Task 1 steps 4, 6, 7, 8.
- §3 (the Worker, its two guards, no CORS) → Task 2.
- §4 (the upload, `rasterBlob`, the readiness wait, teardown, the dedupe guard) → Tasks 3 and 4.
- §5 (the QR, vendored encoder, our drawing, grid snapping, re-snap) → Task 5.
- §6 (best-effort failure) → Task 4 steps 1 and 6, and Task 5's encode `catch`.
- §7 (where the code lives) → the File Structure table, which matches it.
- §8 (what this retires) → Task 6.
- §9 (the unknown) → Task 1 step 9, as a gate with three named outcomes.
- §10 (out of scope) → nothing in this plan builds a viewer page, bakes the QR into the artwork, connects a domain, or rate-limits beyond the size guard.

Names used consistently across tasks: `rasterBlob(kind)`, `startShare()`, `clearShare()`, `renderQR()`, `SHARE.{status,url,sig}`, `shareSig()`, `settle(url)`, `QR_CELLS`, `QR_QUIET`, `WIX_CLIENT_ID`, `WIX_CLIENT_SECRET`, `POST /api/poster-upload` → `{uploadUrl}`.

One place where the plan deliberately says *read the real thing first* rather than guessing: `resetAll()`'s existing structure in Task 4 step 4. Inventing a name there would produce code that looks right and silently does nothing.

**Two things the review caught and the plan now states outright**, rather than leaving to the implementer:

- **`--ink` is the board's ground, not the mark.** The two roles are `--fg` (interface ink) and `--surface` (what ink is set on); there is no `--paper`. A first draft of Task 5 drew the QR as `--ink` on `--paper`, which would have been a light code on nothing.
- **`body.made` inverts the palette, and the QR lives only inside `body.made`.** Following `--fg` on `--surface` would draw every code light-on-dark, which a fair share of phone cameras will not read. The QR pins to the light tones as literals and does not flip — the second reasoned exception to the inversion, after `--chrome-ink`. This is a visible design consequence (a small bright square in a dark ending) and worth confirming with Karin when Task 5 is reviewed rather than after.
