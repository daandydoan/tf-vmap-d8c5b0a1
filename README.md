# Tenderfy Business Admin — Visual Sitemap

A password-gated, single-page visual sitemap of the Tenderfy business-admin app:
every section, tab and subtab as a screenshot card, plus node-by-node **flow maps**
of the Tenders and Responses flows with a findings/bugs panel.

The published site (`docs/index.html`) is **self-contained and encrypted** — all
screenshots are inlined and the whole page is AES-encrypted behind a password.

## Live site

Served via GitHub Pages from the `docs/` folder. Open the Pages URL and enter the
password to unlock.

## Build

```bash
npm install                       # one-time (playwright-core, for capture.js)
node capture.js                   # capture fresh screenshots into shots/ (you log in once)
node build.js                     # inline + encrypt -> docs/index.html
```

- `node build.js` reads `index.html`, inlines every `shots/*.png` as a data URI,
  then AES-256-GCM encrypts the page (key = PBKDF2-SHA256, 200k iterations) and
  writes the unlock gate to `docs/index.html`.
- Change the password without editing code:
  `SITE_PASSWORD="new-pass" node build.js`

## Files

| Path | Purpose |
|------|---------|
| `index.html` | Source sitemap (dev: loads `shots/` at runtime). Edit content here. |
| `build.js` | Inlines screenshots + encrypts → `docs/index.html`. |
| `capture.js` | Playwright script that screenshots every route into `shots/`. |
| `docs/index.html` | **Published** encrypted, self-contained site (GitHub Pages root). |
| `shots/` | Plaintext screenshots — git-ignored (sensitive). |

## Local preview

```bash
# dev source (needs shots/ present locally):
npx http-server . -p 8777    # then open http://localhost:8777/

# encrypted build:
# open http://localhost:8777/docs/index.html  and enter the password
```

## Security note

This is **client-side** password protection — obfuscation, not real access control.
The encrypted blob is public once deployed and the password is shared, so a
determined party could brute-force a weak password (PBKDF2 slows this, but doesn't
prevent it). Use it to gate a demo/internal view, **not** to protect anything truly
sensitive. The plaintext screenshots and the `.pw-profile` login session are
git-ignored and must never be committed.

To update screenshots after a UI change: re-run `node capture.js`, then `node build.js`,
then commit `docs/index.html`.
