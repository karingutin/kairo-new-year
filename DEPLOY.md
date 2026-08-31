# Deploy — KAIRO / Architecture of Time

**Live: https://kairo-new-year-karingu-0e07.wix-site-host.com**

Host: Wix-managed headless, deployed from `build/`. Not GitHub Pages any more
— see the design at
`docs/superpowers/specs/2026-08-30-wix-headless-migration-design.md` for why
the move happened and what it cost.

The site is still a plain static site: one HTML shell, four CSS files, the
`js/` tree, three icons. No build step for any of that — it is a straight
copy. What is new is one small Worker beside it, `worker/poster-upload.js`,
which mints a signed upload URL so a finished poster can be saved to Wix's
media library and handed back as a QR. The Worker never sees the poster's
bytes; the browser uploads straight to Wix's own infrastructure.

---

## The two commands, always in this order

```bash
./tools/stage.sh && wix release
```

**`wix release` does not build anything.** It uploads whatever is already
sitting in `build/`. If you skip the stage, `wix release` ships whatever the
*previous* stage left behind — silently, since there is nothing to error on.
A release without a stage first is the most common way to ship the wrong
thing here.

`./tools/stage.sh` is the one concession this project makes to being
buildless. It does two things, and only two:

1. copies the served site into `build/client` — `index.html`, `css/`, `js/`
   and three icons. Nothing else. See **the stage list**, below.
2. copies `worker/poster-upload.js` into `build/server/entry.mjs`, with the
   two credentials from `.env` substituted in.

It is `cp` and one `sed`. Every source file stays hand-editable and still
opens straight off `file://`, exactly as before.

### The command is `wix`, run bare — not prefixed with `npx`

Every Wix doc you will find prefixes the CLI with `npx`. That does not work
here. `npx` resolves packages against npm's registry, which for this account is
Wix's internal one (`npm.dev.wixpress.com`) — unreachable off the corporate
VPN — and the public registry is blocked as a fallback. `npx` was only ever
needed once, to create the project in the first place, and that is already
done.

The CLI itself is installed globally via Homebrew, sits at `/opt/homebrew/bin/wix`,
and is already authenticated against this project. Just run `wix`.

---

## Prove it on a preview before releasing

```bash
wix preview
```

This builds nothing and stages nothing either — run `./tools/stage.sh` first,
same as for a release. `wix preview` gives back a per-version, shareable URL,
shaped like:

```
https://<slug>-kairo-new-year-karingu-0e07.wix-site-host.com
```

Open it, run the poster through to Create, confirm the QR arrives. A preview
is disposable and does not touch what is live — it is the place to catch a
mistake before it is public.

---

## The stage list is the contract

`tools/stage.sh` copies exactly this into `build/client`:

```
index.html  css/  js/  favicon.svg  favicon.ico  apple-touch-icon.png
```

That list is not a convenience, it is the whole boundary between what ships
and what does not. A new runtime asset that is not added to it works
perfectly locally — because locally the entire repo is still sitting on
disk next to `index.html` — and then 404s on the live site, because Wix only
ever sees `build/client`. If something loads on your machine and not on a
preview, this is the first thing to check.

Two directories that look like assets and are deliberately **not** staged:
`lattice/` and `shapes/`. The lattice engine was ported into
`js/poster/28-lattice.js` and its presets are never fetched at runtime; the
`shapes/` SVGs are reference drawings, not something the page loads. Neither
is referenced from `index.html`, `css/` or `js/` — checkable, and worth
checking again before assuming otherwise.

---

## The server entry must be named `entry.mjs`

The Wix runtime imports `/user-code/entry.mjs` specifically. `tools/stage.sh`
already writes the staged worker to exactly that name
(`build/server/entry.mjs`) — this note exists so nobody "cleans up" the name
later. Any other name deploys without a single error and then answers every
request with `Cannot find module '/user-code/entry.mjs'`, which reads like a
routing fault on the live site and is not one — it is just a file with the
wrong name.

---

## Credentials

`.env` holds two variables, `WIX_CLIENT_ID` and `WIX_CLIENT_SECRET`.
`.env.example` names them and nothing else. Neither `.env` nor `build/` is
ever committed — see `.gitignore`. The worker that actually ships
(`build/server/entry.mjs`) carries the secret substituted in as plain text
inside the file, which is the only arrangement available on a project of this
shape: non-Astro headless projects get no secrets manager.

`wix env pull` does **not** exist on this project type — do not expect it to
work. The client ID is the `appId` already sitting in `wix.config.json`
(`65a8ee1d-3833-48b0-b63a-852c2763c9c8`); the secret is generated once, in the
dashboard, under Settings → Development & integrations → Headless Settings,
and shown exactly once at generation time. Write it down when you see it.

Project identity, for reference, both from `wix.config.json`:

| | |
| --- | --- |
| appId | `65a8ee1d-3833-48b0-b63a-852c2763c9c8` |
| siteId | `e7a216e5-51cb-4685-abe5-b5d4a38973d6` |

---

## Redeploying, and stale content

Nothing redeploys on its own. A push to `main` does nothing to the live
site — every release is the two commands above, run by hand.

**A release also clears the site's cache.** If something changed in the
source but the live site still shows the old version, the fix is the same
two commands, not a cache-busting query string or a wait.

## Rollback

There is no `git revert && push` here — the site does not track `main`. To
roll back, stage and release the commit you want live:

```bash
git checkout <good-commit> -- index.html css js
./tools/stage.sh && wix release
```

(then return the working tree to `main` as usual). A release is fast and
cheap, so rolling forward to a fix is usually simpler than rolling back.

---

## The dev panels need `?dev`

`js/app/79-dev-colors.js` and `js/app/79-dev-poster.js` are Karin's own
working tools — a colour picker and a set of layer sliders — kept in the
tree rather than deleted, but not meant for visitors now that this site is
public. Both still load their `<script>` tag on every page, exactly as
before, but each returns immediately unless the URL carries `?dev`, the same
idiom `?skip` already uses in `js/app/72-boot.js` for the same reason: a
flag in the source is one someone forgets to turn back off before sharing,
and a query string cannot travel by accident. To see either panel, open the
live address with `?dev` appended.

---

## What is not set up, on purpose

**No custom domain.** The site lives at a free `*.wix-site-host.com`
address — the one `wix release` prints. A custom domain needs a Wix premium
plan, and nothing printed or shared depends on the address yet, so this was
deliberately left alone.

**The old GitHub Pages address is not yet a redirect.**
`karingutin.github.io/kairo-new-year/` should eventually become a one-line
redirect stub pointing at the new address, since links to it are already out
in the world. That is Karin's to do, in her own GitHub account, and has not
been done yet.

**Data collection is off**, same as before the migration:
`CONFIG.DATA_ENDPOINT` is empty, so a visitor's answers live only in their
own browser's `localStorage`. The one thing that now leaves the browser is
the finished poster itself, if the visitor presses `Generate QR` — that
upload is best-effort and nothing in the flow waits on it or fails visibly
if it does not arrive.
