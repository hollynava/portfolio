import { next } from '@vercel/functions';

// ── Config ────────────────────────────────────────────────────────────────
// Set these in Vercel → Project → Settings → Environment Variables (all envs):
//   SITE_PASSWORD  the password you hand out
//   AUTH_SECRET    32+ random chars, UNRELATED to the password
//                  (generate with:  openssl rand -base64 32)
const PASSWORD = process.env.SITE_PASSWORD;
const SECRET = process.env.AUTH_SECRET;
const COOKIE = 'site_auth';
const MAX_AGE = 60 * 60 * 4; // 4 hours
const enc = new TextEncoder();

// ── Signed-cookie helpers (HMAC-SHA256 over the expiry) ─────────────────────
async function sign(value) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Constant-time comparison — avoids leaking a secret one character at a time.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidCookie(token) {
  if (!token) return false;
  const [expiry, sig] = token.split('.');
  if (!expiry || !sig) return false;
  if (Number(expiry) < Date.now()) return false;
  return timingSafeEqual(sig, await sign(expiry));
}

function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

// ── Login page (styled to match the site) ───────────────────────────────────
function loginPage(error = false) {
  return new Response(
    `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Holly Nava — Private Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{--page:#FCFAF5;--panel:#F3EFE8;--ink:#1C1A16;--muted:#7E786F;--faint:#9E9488;--line:#EBE4D9}
  *{box-sizing:border-box;margin:0}
  body{background:var(--page);color:var(--ink);font-family:"Inter",system-ui,sans-serif;min-height:100svh;display:grid;place-items:center;padding:24px}
  .box{background:var(--panel);border-radius:30px;padding:56px;max-width:520px;width:100%;text-align:center}
  @media(max-width:680px){.box{padding:40px 24px}}
  .gk{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  h1{font-size:clamp(22px,4vw,28px);margin:12px 0 10px;font-weight:600;letter-spacing:-.02em}
  p{color:var(--muted);margin:0 auto 22px;font-size:16px;line-height:1.5;max-width:44ch}
  form{display:flex;gap:10px;flex-wrap:wrap;max-width:480px;margin:0 auto;justify-content:center}
  input{flex:1;min-width:200px;padding:13px 16px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:15px;background:#fff;color:var(--ink)}
  input:focus{outline:none;border-color:var(--ink)}
  button{padding:13px 28px;border-radius:999px;font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;background:var(--ink);color:#fff;border:1px solid var(--ink);cursor:pointer}
  button:hover{opacity:.88}
  .err{color:#b23b3b;font-size:13.5px;margin-top:14px;min-height:18px}
</style>
</head><body>
  <div class="box">
    <div class="gk">Private Portfolio</div>
    <h1>This work is password-protected</h1>
    <p>Enter the password to view selected projects, testimonials, and more. Reach out if you need it.</p>
    <form method="POST">
      <input name="password" type="password" placeholder="Password" autofocus autocomplete="current-password" aria-label="Password">
      <button type="submit">Enter</button>
    </form>
    ${error ? '<div class="err">Incorrect password. Please try again.</div>' : ''}
  </div>
</body></html>`,
    {
      status: error ? 401 : 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}

// ── Middleware ──────────────────────────────────────────────────────────────
export default async function middleware(request) {
  // Fail closed if the env vars aren't set, rather than silently allowing in.
  if (!PASSWORD || !SECRET) {
    return new Response('Site auth is not configured.', { status: 503 });
  }

  // Already authenticated? Let the request through to the static file.
  const token = readCookie(request.headers.get('cookie'), COOKIE);
  if (await isValidCookie(token)) return next();

  // Login submission.
  if (request.method === 'POST') {
    const form = await request.formData();
    const submitted = String(form.get('password') ?? '');

    if (!timingSafeEqual(submitted, PASSWORD)) {
      await new Promise((r) => setTimeout(r, 500)); // blunts rapid guessing
      return loginPage(true);
    }

    const expiry = String(Date.now() + MAX_AGE * 1000);
    const value = `${expiry}.${await sign(expiry)}`;
    const path = new URL(request.url).pathname;

    const res = new Response(null, { status: 303, headers: { location: path } });
    res.headers.append(
      'set-cookie',
      `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
    );
    return res;
  }

  // Everyone else gets the gate.
  return loginPage();
}

// Gate every request except the favicon. This DOES cover every .html page,
// the résumé PDF, and all images/video — which is the point.
export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
