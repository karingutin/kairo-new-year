# Deploy — KAIRO / Architecture of Time

**Live: https://karingutin.github.io/Archi-Time/**

Host: GitHub Pages, served from `main` at the repository root. First deployed
17 August 2026, commit `914a197`.

The site is a plain static site: one HTML shell, four CSS files, thirty-four JS
files, nine SVGs. No build step, no bundler, no server. Pages copies the branch
and serves it, which is exactly what this project needs — the `<script src>`
order in the shell IS the execution order, and nothing must be allowed to
reorder or concatenate it.

Data collection is **off**: `CONFIG.DATA_ENDPOINT` is empty, so a visitor's
answers live only in their own browser's `localStorage`. Nothing leaves the
machine, so the site needs no privacy notice and no backend.

---

## What was set up

| | |
| --- | --- |
| Host | GitHub Pages, branch `main`, folder `/ (root)`, HTTPS enforced |
| Repo visibility | Public |
| Address | `karingutin.github.io/Archi-Time` — a custom domain can be added later without breaking anything |
| Answer collection | None. `localStorage` only |
| Build source | Deploy from a branch, not Actions. A plain file copy, which is the right choice for a project whose load order is hand-authored |

### Files taken out of the public tree

The repo was private before this, so it carried things that were never written
to be read by strangers. Publishing a repo publishes **the whole history**, so
untracking a file does not remove it from past commits — everything below is
still reachable in the history before `914a197`. Nothing there is a secret;
this was a decision about what the tree presents, not a scrub.

Untracked, kept on disk, guarded by the repo's first `.gitignore`:

- `handoff/` (22 files, including `handoff/memory/*.md`) — private working notes
- `פוסטרדמה.psd` and `ניסיון עם אלמנטים שלי` — working art files
- `lattice/week.html`, `lattice/weekend.html` and the two `… new.html` — Brik
  exports carrying `base44.app` asset URLs, a `frog.wix.com` beacon and a
  PostHog endpoint
- `architecture-of-time-dots.html` — the pre-split monolith, which carries the
  same three URLs, kept as the byte-for-byte reference the split was checked
  against

Kept, deliberately: `PRODUCT.md`, `SPLIT_PLAN.md`, `CLAUDE.md`, `docs/` and the
prototype HTMLs. They are the honest record of the build, and `lattice/`'s
engine, port and presets are the source the tracked
`js/poster/28-lattice.js` was ported from.

### The rename

`architecture-of-time.html` became **`index.html`**, because Pages serves that
at `/`. `CLAUDE.md`, `PRODUCT.md` and the `?skip` note in `js/app/72-boot.js`
follow it. `SPLIT_PLAN.md` and the dated design specs under `docs/` keep the
old name on purpose: they are records of what was done at the time, not
instructions.

An empty `.nojekyll` sits at the root. Nothing here starts with an underscore
so Jekyll would not currently eat anything, but it removes a class of future
surprise and makes the build faster.

### The `?endpoint=` gate

`js/app/70-collect.js` used to let any URL set the webhook. It now reads the
parameter on `localhost`, `127.0.0.1` and `file:` only. On a public URL it was
a link anyone could craft that makes the page post a visitor's answers to a
host of the sender's choosing — only the visitor's own session at stake, but
no reason for the door to be there. To point the live site at a webhook, set
`CONFIG.DATA_ENDPOINT` in the source.

---

## Verified live

Checked on https://karingutin.github.io/Archi-Time/ after the first build:

- All 40 requests return 200 — index, four CSS, thirty-four JS. macOS is
  case-insensitive and Pages is not, so this is the check that matters, and it
  matters most right after a rename.
- Zero console errors and zero console warnings.
- `Wix Madefor Display` loads from Google Fonts.
- The KAIRO landing renders, START runs the grid transition, and the board
  arrives with the mark, the sheet and the first question's two dials.
- `CONFIG.DATA_ENDPOINT` is `""` and the `?endpoint=` gate evaluates `false`
  on the live host.

Still unchecked: Safari, and a real phone.

## Redeploying

Every push to `main` redeploys automatically, within about a minute. There is
no staging step — whatever lands on `main` is what the world sees. Work that
is not ready for that belongs on a branch.

## Rollback

Pages always serves the last pushed commit:

```bash
git revert HEAD && git push
```

Live again in about a minute. There is no build cache to clear.

---

## Open items

**Small screens.** The whole interface is snapped to the `--cell` grid and was
built at desktop sizes. A public link will be opened on phones. Either verify
the grid holds at 375px, or add an honest small-screen notice. This is what
most visitors will hit first.

**Sharing metadata.** No `<meta name="description">`, no Open Graph tags, no
favicon. A link pasted into Slack or WhatsApp shows a bare URL. One block in
the shell's `<head>` plus one preview image fixes it. Cosmetic, but this is a
poster tool — the preview is part of the invitation.

**Fonts.** `Wix Madefor Display` comes from Google Fonts over the network. If
Google Fonts is blocked or slow the interface falls back. Acceptable, and it is
the only external dependency the site has.

**Discoverability.** A public repo and a public Pages site are indexable. If
this should be shareable-by-link but not searchable, add a `robots.txt`
disallow — a request, not a wall, but it handles the honest crawlers.

**Custom domain.** Settings → Pages → Custom domain, then a `CNAME` record at
the registrar pointing to `karingutin.github.io`. Pages issues the certificate.
The old address keeps redirecting, so nothing shared today breaks.
