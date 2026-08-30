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
const LIST_URL   = 'https://www.wixapis.com/site-media/v1/files';
const DELETE_URL = 'https://www.wixapis.com/site-media/v1/bulk/files/delete';

/* The Media Manager folder every poster upload is pointed at. It already
   exists in Karin's Media Manager — this worker does not create it, and
   never should — and the reason it exists at all is the sweep further down:
   an age-based bulk delete is only a safe thing to run automatically if the
   folder it is scoped to can only ever contain posters. Point parentFolderId
   at anything wider — the library root, say — and the sweep stops being a
   housekeeping routine and becomes a countdown timer over Karin's actual
   photos. This id IS the blast radius, so it is kept as small as the thing
   it is meant to protect. */
const POSTERS_FOLDER_ID = '68ca93bd2a584282a097b0686c53afbe';

/* The sweep's whole reason to exist: Wix Media has no TTL, no field you can
   set on a file that makes it expire on its own. So "a poster does not
   outlive 48 hours" is a promise this worker keeps by hand, written out as
   arithmetic rather than a bare millisecond count so the 48 stays legible at
   the call site below. */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

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
                   + Math.random().toString(36).slice(2, 8) + '.jpg';

    try {
      const token = await accessToken(false);

      /* The sweep rides alongside mint(), not before it and not after it —
         the visitor on the other end is waiting on uploadUrl, and 48-hour
         housekeeping has no claim on their time. Promise.allSettled means a
         rejected sweep can never become a rejected handler; sweep() below
         also wraps its own body in try/catch and console.logs a failure the
         same way the other error paths in this file do, so this is belt and
         suspenders, not decoration. Worst case a sweep fails silently and
         some posters live a little past 48 hours until the next visitor's
         request tries again — that is an acceptable cost, failing someone's
         upload over a cleanup job is not. */
      const [mintResult] = await Promise.allSettled([
        mint(token, fileName, size),
        sweep(token)
      ]);
      if (mintResult.status === 'rejected') throw mintResult.reason;
      let r = mintResult.value;
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
      /* JPEG, not PNG, and the two halves of this had to move together: the
         browser PUTs image/jpeg (see js/app/64-share.js), so telling Wix
         image/png here would store the file under a mime type it is not.
         The poster loses nothing by it — buildSVG lays an opaque ground rect
         the full size of the sheet, so there is no transparency to keep — and
         it was the single biggest win available on the wait: the upload was
         4.6 of the 8 seconds, and it is the bytes that cost, not the format. */
      mimeType: 'image/jpeg',
      fileName: fileName,
      sizeInBytes: String(size),
      private: false,         // a private file's url returns 403, and a QR of a 403 is a dead QR
      /* Every poster lands in the dedicated folder, never loose in the
         library root. See the comment on POSTERS_FOLDER_ID above — this is
         what keeps the sweep's bulk delete scoped to posters and nothing
         else. */
      parentFolderId: POSTERS_FOLDER_ID
    })
  });
}

/* Best-effort housekeeping, run once per upload request. It lists the
   posters folder oldest-updated first, deletes anything whose createdDate
   is more than 48 hours old, and never lets a failure of its own escape —
   the try/catch below plus the Promise.allSettled at the call site are two
   independent reasons this function can never fail an upload.

   The honest limitation: this is the only clock the sweep has. There is no
   scheduled-Worker trigger wired up here — cron triggers on this hosting
   lane are an Astro-integration feature, and this project is deliberately
   not built on Astro, so there is no background job ticking on its own.
   That means the sweep only runs when a visitor uploads a poster. If the
   site sees no traffic for a week, last week's posters sit past their
   48 hours, untouched, until the next visitor's request runs this function
   again. The guarantee this file actually offers is therefore "a poster
   is deleted within 48 hours of the next upload after it turns 48 hours
   old" — not a hard TTL. Anything stronger would need a scheduler this
   project does not have. */
async function sweep(token) {
  try {
    /* createdDate — the field the age check below actually reads — is not
       one of the fields this API can sort by; only displayName, updatedDate
       and sizeInBytes are. Sorting on updatedDate ASC is the closest proxy:
       oldest-updated first, so a single page of 100 keeps surfacing the
       files most likely to have aged past 48 hours rather than the newest
       ones. */
    const q = new URLSearchParams({
      parentFolderId: POSTERS_FOLDER_ID,
      mediaTypes: 'IMAGE',
      'paging.limit': '100',
      'sort.fieldName': 'updatedDate',
      'sort.order': 'ASC'
    });

    const listRes = await fetch(LIST_URL + '?' + q.toString(), {
      // Same rule as mint(): the raw token, never 'Bearer ' + token.
      headers: { 'Authorization': token }
    });
    if (!listRes.ok) {
      console.log('sweep list failed', listRes.status, await listRes.text());
      return;
    }

    const listBody = await listRes.json();
    const files = (listBody && listBody.files) || [];
    const cutoff = Date.now() - MAX_AGE_MS;
    const staleIds = files
      .filter((f) => Date.parse(f.createdDate) < cutoff)
      .map((f) => f.id);
    if (!staleIds.length) return;

    const deleteRes = await fetch(DELETE_URL, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      /* permanent: true is not a nicety here, it is the entire point of this
         function. Wix's own docs describe a non-permanent delete as moving
         the file to a trash bin, where it "still appear[s] on the site as
         the files are still in the Media Manager" — i.e. the URL a visitor
         printed on a QR code twelve hours ago would keep resolving, and the
         48-hour promise this file exists to keep would be a lie. */
      body: JSON.stringify({ fileIds: staleIds, permanent: true })
    });
    if (!deleteRes.ok) {
      console.log('sweep delete failed', deleteRes.status, await deleteRes.text());
    }
  } catch (e) {
    console.log('sweep error', e && e.message);
  }
}
