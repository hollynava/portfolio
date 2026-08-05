# Holly Nava — Portfolio

Static, hand-built portfolio site. Plain HTML/CSS/JS, **one self-contained file per page** (inline `<style>` and `<script>`, no build step, no framework). Deployed from GitHub → Vercel, gated behind a shared password via edge middleware.

Owner voice: Holly Nava, a design-rooted Director of Product (construction robotics, AI, product strategy). Tone across the site is warm, confident, plain-spoken — no buzzword soup.

## Repo layout (all at root)

Pages (edit these):
- `index.html` — home (hero, rotating testimonials, logos, three featured project cards)
- `about.html` — about (2-column masonry of cards)
- `work.html` — all projects grid
- Case studies: `buildos.html`, `vitruvius.html`, `walmart.html`, `robotics.html`, `opensignal.html`, `poker.html`
- `robotics-story.html` — **hidden** long-form scrollytelling walkthrough for interviews. Not linked from nav or `work.html`; reachable only by direct URL. First draft, still being iterated.

Infra:
- `middleware.js` — Vercel edge middleware, the password gate (see below). **Do not break this.**
- `package.json` — `type: module` + `@vercel/functions` (needed by the middleware's `next()`).
- `vercel.json` — security headers (`X-Robots-Tag: noindex`, etc.). Keep.

Assets: images are mostly `.webp` (per-project prefixes: `wm-`/`wmn-` Walmart, `vit-` Vitruvius, `rob-` robotics, `pk-` poker, `mc-`/`buildos-` BuildOS, `os-` OpenSignal), a few `.jpg`/`.png`/`.mp4`, plus `holly-sketch1/2.webp` (transparent pencil portraits) and `HollyNava-Resume.pdf`.

**Ignore/never edit** the stale variant files if present: `*.deploy.html`, `*.pd.html`, `*_inline.html`, `*_pretab_backup.html`. Only the canonical page files above are live. (A linter/formatter may re-add a `<meta name="robots" noindex…>` tag — that's expected, leave it.)

## Design system (shared across pages)

CSS variables (identical in every page's `:root`):
```
--page:#FCFAF5; --panel:#F3EFE8; --card:#FFFFFF;
--ink:#1C1A16; --muted:#7E786F; --faint:#9E9488; --line:#EBE4D9; --tag:#EFE9E0;
--r:30px; --r2:18px; --max:1320px;
```
Font: **Inter** (Google Fonts). Warm off-white page, beige panels, near-black ink. Big beige rounded panels (`.panel`), generous spacing, minimal bold/lists in prose.

Reveal-on-scroll: elements with class `reveal` fade/slide in via an `IntersectionObserver` that adds `.in`. Every page has this observer at the bottom.

### Case-study component (`buildos/vitruvius/walmart/robotics/opensignal/poker`)
Tabbed body:
- `.csx-tabs` > `.csx-tab[data-t=...]` buttons — **three tabs: "The Challenge" / "What I did" / "Outcome"** (data-t values are still `overview` / `did` / `outcome`). Tabs are **sticky** (`position:sticky;top:0`) and larger on mobile.
- `.csx-panel[data-p=...]` panels; JS toggles `.on` where `data-p === active tab's data-t`.
- Challenge tab: `.csx-split` (text left `.csx-text`, media right `.csx-media`) + `.csx-mg.full` meta strip (Role/Team/Timeline).
- What-I-did tab: `.csx-did` > repeated `.csx-move` (text + image, 2-col; `.solo` = full-width). No top headline (removed). Some end with a **Before → After** grid (`display:grid;1fr auto 1fr`, tinted "Before" box → white "After" box). Present on BuildOS, Vitruvius, Walmart, Robotics only.
- Outcome tab: `.csx-lead` + visuals. `.csx-gif` = crossfading image rotator (2+ stacked `<img>`, JS toggles `.on` every ~2.4s).

### About page
Two explicit columns: `.cols` (grid 1fr 1fr) > two `.col` > `.mcard` cards. Left col = Intro + Beliefs; right col = Background/résumé + AI (with an inset dark `.mq` quote). **Responsive reorder:** at ≤820px, `.col{display:contents}` + inline `order:` on each `.mcard` makes the stack go Intro → Background(jobs) → AI → Beliefs.

### robotics-story.html (scrollytelling)
`.act` full-width sections revealed on scroll; `.band` = beige band, `.band.ink` = dark cinematic band; `.stmt` big statement, `.lede` body, `.stats` payoff row; fixed top scroll `.progress` bar; full-bleed `.hero`. Paced for live narration.

## Conventions
- **One file per page.** Inline everything. No external CSS/JS besides the Inter font link.
- Images: prefer `.webp`. Device mockups that should float on the page must be **exported transparent** (the black-background renders can't be cleanly stripped after the fact). Videos autoplay muted/loop, played/paused by an `IntersectionObserver` when in view.
- Keep the palette/tokens above; match existing type scale and spacing.
- After visual changes, verify by actually rendering (open the page / headless screenshot) before calling it done.

## The password gate (middleware.js)
Real, server-side protection — **not** a client gate.
- Reads env vars `SITE_PASSWORD` (the shared password) and `AUTH_SECRET` (32+ random chars, unrelated). Set in **Vercel → Settings → Environment Variables** for Production + Preview. Never commit them.
- Signs an HMAC cookie (`site_auth`), **4-hour** expiry, constant-time compare, gates every path except `favicon.ico` (covers all HTML, the PDF, and media). **Fails closed** (503) if env vars are missing.
- If you add a webhook/integration that must reach the site, give it a carve-out in the `matcher`.
- The old client-side gate has been removed from `index.html` — don't reintroduce it.

## Anonymization (Walmart case study)
Copy refers to the client as **"one of the world's largest retailers"** (never "Walmart" in prose). Tool screenshots have client/supplier names redacted. Holly has chosen to reveal the client *visually* via a store-aisle card photo and a negotiation-meeting photo (and a demo supplier name "Chobani" is visible on some tool screens) — that's intentional; leave it. Keep prose anonymized.

## Deploy & verify
Git-backed, auto-deployed by Vercel. Production branch = `main`.
1. Branch → commit → push. Vercel builds a **Preview** deployment for the branch (env vars are set for Preview too).
2. Test the preview URL: password prompt appears; a case-study page and the résumé PDF also prompt when hit directly.
3. Merge to `main` → production deploys to `hollynava.vercel.app`.
4. Undo options if needed: **Instant Rollback** (dashboard, one deployment back on Hobby) or `git revert` the commit. A failed build never replaces live production.
- Env-var changes only take effect on a new deployment (redeploy after editing them).
- Custom domain `hollynava.me` (Squarespace-registered) is **on hold** — not pointed at Vercel yet.

## In flight / recent
- `robotics-story.html` is a first-draft hidden walkthrough — expect iteration on arc, copy density, and whether "Fleet" becomes its own beat.
- Recent content edits (home "I craft…", About beliefs, robotics visibility + transparent Titan tablets + what's-next photo, poker image bleed, footer + meta "Director of Product" removal, résumé PDF swap) — confirm what's merged vs. pending with `git status` / `git diff main`.
