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
