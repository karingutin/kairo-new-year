# Wix Headless, and the QR — design

**Date:** 2026-08-30
**Status:** designed, not built.

Hosting moves off GitHub Pages and onto Wix-managed headless, and the poster
upload that was drafted against Netlify is rebuilt there instead. One host, one
origin, one release command. The Netlify work is deleted rather than ported:
none of it was ever pushed, and the Wix shape is different enough that porting
it would be pretending otherwise.

Past the migration the site gains one thing it did not have: at the Create press
the finished poster is uploaded, and a QR of its permanent address is drawn on
the grid beside it, for the visitor to take away with a phone.

---

## 1. What moves, and what does not

**The site is not restructured.** Wix-managed headless has a lane that serves
static files exactly as they are — no build, no components, no CMS. The
150-line shell stays a 150-line shell, the numbered `<script src>` tags stay the
execution order, the one global scope stays one global scope. Everything in
`SPLIT_PLAN.md` and everything in `CLAUDE.md` survives untouched.

What changes is where the files land and how they get there:

| | before | after |
|---|---|---|
| host | GitHub Pages, from the repo root | Wix-managed headless, from `build/` |
| deploy | `git push` | `tools/stage.sh && npx wix release` |
| address | `karingutin.github.io/kairo-new-year/` | a `*.wix-site-host.com` URL |
| backend | none live (Netlify drafted, never pushed) | one Cloudflare Worker beside the site |

The old address stays alive as a one-line redirect stub, because links to it are
already out in the world. A custom domain is deliberately not part of this: it
needs a Wix premium plan, and nothing printed depends on the address yet.

Setup runs through Wix's own skill rather than by hand — `bootstrap.mjs`,
device-code login, `npx skills add wix/skills`, then `wix-headless/SKILL.md` in
**connect** mode against this repo. It writes `wix.config.json` itself.

---

## 2. The deploy shape, and the one concession

```json
{
  "projectType": "Site",
  "appId":  "…",
  "siteId": "…",
  "site": {
    "outputDirectory": { "client": "./build/client", "server": "./build/server" }
  }
}
```

The obvious thing to write is `"client": "."` — the site already sits at the
root, ready to serve, and that is the whole appeal of the lane. **It is wrong,
and quietly so.** Wix serves the client directory verbatim, so a `worker/`
folder at the root would be published at `/worker/poster-upload.js`, credential
and all. Non-Astro projects get no secrets manager, so the credential has to be
inside the worker file — which means the worker file can never be reachable from
the client half.

Hence `tools/stage.sh`, and it is the one concession this design makes to the
buildless rule:

1. copy the served site into `build/client` — and it is a short list:
   `index.html`, `css/`, `js/`, `favicon.svg`, `favicon.ico`,
   `apple-touch-icon.png`. Nothing else is fetched at runtime.
2. copy `worker/poster-upload.js` into `build/server`, substituting the
   credential from an untracked `.env`
3. leave everything else behind — `docs/`, the `.md` files, `tools/`, the
   prototypes (`nine-questions-prototype.html`, `dial-demo.html`,
   `grid-*.html`, `archive.html`), and `lattice/` and `shapes/`

That last point is a gain, not a cost. Pages served the whole repo because it
had no say in the matter; the prototypes and the working notes have been public
this whole time by accident. A stage step means what ships is chosen.

`lattice/` and `shapes/` are worth calling out because they look like assets and
are not. The lattice engine was ported into `js/poster/28-lattice.js` and its
presets are not fetched at runtime; the shape SVGs are reference drawings.
Nothing under either directory is referenced from `index.html`, `css/` or `js/`,
which is checkable and should be checked rather than assumed — **if the stage
list and the site ever disagree, the site fails on the released URL and not
locally**, because locally the whole repo is still sitting there.

It is `cp` and one `sed`, not a bundler. The source files stay hand-editable and
still open straight off `file://` or any static server, exactly as today. That
is the test this step must keep passing: **if `tools/stage.sh` ever needs to
transform a file the browser could have read directly, it has stopped being a
copy and the buildless claim is gone.**

`build/` and `.env` are gitignored. `.env.example` is committed, naming the two
variables and nothing else.

---

## 3. The Worker

One file, `worker/poster-upload.js`. Plain ESM, no npm, no dependencies, no
bundling step — `export default { async fetch(request, env) }` and `fetch()`
against Wix REST. One route, `POST /api/poster-upload`.

It takes `{ size }` — a byte count, nothing else — and returns `{ uploadUrl }`.

```
client_credentials grant ──► access token (cached per isolate, refreshed on 401)
                              │
POST /site-media/v1/files/generate-upload-url
  { mimeType: "image/png", fileName, sizeInBytes, private: false }
                              │
                              └──► { uploadUrl }
```

**The poster's bytes never touch it.** That is the whole reason this shape beats
the Netlify draft, where every byte of every PNG streamed through a function and
into a blob store the function also had to read back out of. Here the Worker
mints a signed URL and steps away; the browser uploads to Wix's media
infrastructure directly and Wix's CDN serves it afterwards. There is no
`poster.js` equivalent in this design because there is nothing to serve.

It also drops the CORS block that opened `upload-poster.js`. Client and Worker
are one origin now, so the call is a relative `fetch('/api/poster-upload')` and
the `Access-Control-Allow-Origin: *` that the cross-origin split forced is
simply not needed.

Two guards, since the route is public and unauthenticated:

- `size` must be a number inside a sane band (say 1 KB to 25 MB). A missing or
  absurd size is a 400 before any Wix call is made.
- the response carries nothing but `uploadUrl`. No token, no ids, no echo of
  anything the caller sent.

An upload URL is a capability to write one file, which is what the feature is.
Beyond that, rate limiting is not designed here — see *out of scope*.

---

## 4. The upload, and where it hooks in

`exportRaster()` in `js/app/70-collect.js` already does the hard half: build the
SVG, load it into an `Image`, draw it onto a canvas sized to the whole sheet
including the record band, and `toBlob()`. It then hands the blob to
`download()`.

Split that in two. `rasterBlob(kind)` returns the blob; `exportRaster()` becomes
the thin thing that calls it and downloads the result. The uploader calls the
same `rasterBlob('png')`. **The scanned poster and the saved poster are then the
same bytes by construction**, rather than by two code paths agreeing.

The flow, on the Create press:

1. `showFinish()` fires. Everything it does today it still does, on the same
   frame — the record is stamped, the sheet grows, the ending arrives. The
   upload is started here and **awaited by nothing**.
2. `rasterBlob('png')` → blob.
3. `POST /api/poster-upload` with `{ size: blob.size }` → `{ uploadUrl }`.
4. `POST` the blob to `uploadUrl` → a file descriptor whose `url` is a permanent
   public `static.wixstatic.com` address.
5. Wix notes an uploaded file is not readable the instant the upload returns, so
   the address is not trusted until it loads: a hidden `Image` against it, with
   a short backoff and a hard cap of a few tries. Only then does the QR appear.

`hideFinish()` and `resetAll()` tear it down. Backing out of the ending is
backing out of a poster, and the QR of the one before it must not still be
standing there when the next Create lands.

Re-pressing Create on an unchanged session should not upload twice. The blob is
keyed on the same signature `submit()` already computes for its resubmit guard —
answers, rolls, format — and a repeat press reuses the address it already has.

---

## 5. The QR

Encoding is vendored, drawing is ours.

A single-file MIT encoder goes in `js/vendor/` — one script tag, no build, no
dependency, in keeping with everything else here. But its own canvas or
`<img>` output is not used. The module matrix comes out of it and **we draw it
as SVG rects**, because a QR that Wix's library styles is a QR that ignores the
`--cell` grid, and `CLAUDE.md` is not ambiguous about that: this is interface
chrome, so its position and its size both land on grid lines.

- the QR's box is a whole number of cells square, snapped against `gridOrigin()`
  the way `placeChrome()` does it
- one module is a cell fraction — the box's cell count divided by the matrix
  width, which for a URL of this length wants roughly a 6×6 or 7×7 cell box
- ink and paper are the poster's own two roles, not black and white
- it re-snaps on resize and on format change, like every other piece of chrome

It arrives with the rest of the ending rather than on its own clock, and it
respects reduced motion by simply being there.

---

## 6. When it fails

**The upload is best-effort and nothing waits on it.** A visitor who finishes a
poster gets their poster: it renders, it grows, it downloads, it prints. If the
Worker is down, if Wix's media service is slow, if the network drops between
step 3 and step 4, the QR panel shows a quiet failed state and the ending is
otherwise exactly what it is today.

This is the one hard rule of the feature. Nothing in the upload path may block
`showFinish()`, throw into it, or leave the ending half-arrived. Every step is
inside a `catch` that ends in the same quiet state.

---

## 7. Where the code lives

| file | what |
|---|---|
| `worker/poster-upload.js` *(new)* | the Worker: token, `generate-upload-url`, the two guards |
| `tools/stage.sh` *(new)* | the copy into `build/`, and the credential substitution |
| `js/vendor/qrcodegen.js` *(new)* | the vendored encoder, untouched |
| `js/app/64-share.js` *(new)* | the upload call, the readiness wait, the QR's geometry and its teardown |
| `js/app/70-collect.js` | `rasterBlob()` split out of `exportRaster()` |
| `js/app/51-flow.js` | `showFinish()` starts the upload; `hideFinish()` tears it down |
| `js/app/55-reset.js` | the same teardown on reset |
| `css/10-chrome.css` | the QR panel's rules |
| `index.html` | two `<script>` tags |
| `wix.config.json` *(new)* | written by the Wix skill, `outputDirectory` corrected by hand |
| `.env.example` *(new)*, `.gitignore` | the two variables; `build/` and `.env` ignored |
| `DEPLOY.md` | rewritten around `wix preview` and `wix release` |

`64-share.js` sits after `63-record.js` and before boot. It calls `rasterBlob()`,
which is declared at 70 — later in the tag order, but the call happens at a
press, long after every file is parsed, so the order is fine. It is worth
saying out loud because the numeric prefixes usually mean exactly what they
look like.

---

## 8. What this retires

Deleted outright: `netlify.toml`, `netlify/functions/upload-poster.js`,
`netlify/functions/poster.js`, `netlify-publish/`, and the `package.json` that
existed only to name `@netlify/blobs`. None of it was ever pushed or deployed.

`DEPLOY.md` is rewritten rather than amended — it currently describes a GitHub
Pages flow and still names the older Archi-Time address, which was already
wrong before this design.

---

## 9. The unknown to prove first

The docs describe client and server deployed "side by side" with relative
`fetch` calls from one to the other, but do not spell out the routing
precedence: whether Wix matches a static file first and falls through to the
Worker, or hands the Worker every request and expects it to serve the site too.
If it is the latter, `worker/poster-upload.js` grows a static-asset branch and
its shape changes.

**Nothing else in this design gets built until that is answered**, by a
throwaway `/api/ping` released to a preview URL alongside the unmodified site.
`npx wix preview` gives a per-version shareable URL, which is where the whole
upload path gets proven before anything is released.

---

## 10. Out of scope

- **The QR is not drawn into the artwork.** It is chrome beside the poster, not
  ink on it. Baking it in means render → upload → re-render, and a downloaded
  poster that differs from the uploaded one. That is a separate design if it is
  ever wanted.
- **No viewer page.** The QR encodes the media URL directly; scanning opens the
  PNG. There is no `/p/?id=`, no id-to-poster mapping, nothing to keep in sync.
- **No custom domain**, and so no premium plan. A `*.wix-site-host.com` address
  is what ships.
- **No member accounts, no gallery, no archive of uploaded posters.** A poster
  is uploaded and its address handed to the person who made it. Nothing lists
  them and nothing links them to a session.
- **No rate limiting or abuse handling on the Worker** beyond the size guard.
  The route can mint upload URLs for anyone who finds it. Worth revisiting if
  the site is ever promoted anywhere; not worth designing against on day one.
- **Analytics, SEO and error monitoring** are Astro-lane features and are not
  coming with this. The site has never had them.
- **No change to any question, any layer, or any of the poster's geometry.**
