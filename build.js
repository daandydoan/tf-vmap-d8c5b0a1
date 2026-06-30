// Build the password-gated, self-contained site into ./docs/index.html
//
//   node build.js
//   SITE_PASSWORD="other-pass" node build.js   (override the default)
//
// What it does:
//   1. Reads index.html (the source sitemap).
//   2. Inlines every shots/<name>.(png|jpg|webp) as a base64 data URI, so the
//      page needs NO external files (nothing is left fetchable on the server).
//   3. AES-256-GCM encrypts the whole HTML with a key derived from the password
//      (PBKDF2-SHA256, 200k iterations) and wraps it in a small unlock gate that
//      decrypts in-browser via the Web Crypto API.
//
// NOTE: client-side encryption is obfuscation, not strong security. The ciphertext
// is public once deployed; the password is shared and brute-forceable. Fine for
// gating a demo/internal site; do not treat it as real access control.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'index.html');
const SHOTS = path.join(ROOT, 'shots');
const OUT_DIR = path.join(ROOT, 'docs');
const PASSWORD = process.env.SITE_PASSWORD || 'Tenderfy@2026';
const ITERATIONS = 600000; // OWASP-recommended floor for PBKDF2-SHA256; slows offline brute-force

// 1. source HTML --------------------------------------------------------------
let html = fs.readFileSync(SRC, 'utf8');

// strip the dev-only "drop a PNG into shots/" banner from the published site
html = html.replace(/\n?\s*<div class="howto">[\s\S]*?<\/div>\s*/, '\n\n  ');

// 2. inline screenshots as data URIs -----------------------------------------
const mimes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const shotMap = {};
let inlined = 0;
if (fs.existsSync(SHOTS)) {
  for (const f of fs.readdirSync(SHOTS)) {
    const ext = path.extname(f).slice(1).toLowerCase();
    if (!mimes[ext]) continue;
    const key = f.slice(0, -(ext.length + 1));
    shotMap[key] = `data:${mimes[ext]};base64,` + fs.readFileSync(path.join(SHOTS, f)).toString('base64');
    inlined++;
  }
}
// inject the map just before the page's main <script> so it's defined first
html = html.replace('<script>', `<script>window.__SHOTS__ = ${JSON.stringify(shotMap)};</script>\n<script>`);

// PLAIN mode: publish the self-contained page WITHOUT the password gate
if (process.env.PLAIN) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
  console.log('Built docs/index.html (PLAIN — no password)');
  console.log('  screenshots inlined : ' + inlined);
  console.log('  page size           : ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
  process.exit(0);
}

// 3. encrypt ------------------------------------------------------------------
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(PASSWORD, salt, ITERATIONS, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(Buffer.from(html, 'utf8')), cipher.final()]);
const payload = Buffer.concat([ct, cipher.getAuthTag()]); // WebCrypto expects ciphertext||tag
const CFG = {
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  data: payload.toString('base64'),
  iter: ITERATIONS,
};

// 4. unlock gate --------------------------------------------------------------
const gate = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Tenderfy — protected</title>
<style>
  :root{--teal:#179e77;--teal-dark:#0f6e56;--ink:#1f2422;--muted:#6b726e;--line:#e3e6e3;--bg:#f6f7f5}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:var(--bg);color:var(--ink);display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:30px 28px;width:340px;
    box-shadow:0 10px 40px rgba(20,40,30,.08);text-align:center}
  .mark{width:40px;height:40px;border-radius:10px;background:var(--teal);color:#fff;font-weight:600;
    display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:19px}
  h1{font-size:17px;font-weight:600;margin:0 0 4px}
  p{font-size:13px;color:var(--muted);margin:0 0 18px;line-height:1.5}
  form{display:flex;flex-direction:column;gap:10px}
  input{padding:11px 13px;border:1px solid var(--line);border-radius:10px;font-size:14px;width:100%}
  input:focus{outline:none;border-color:var(--teal)}
  button{padding:11px;border:0;border-radius:10px;background:var(--teal);color:#fff;font-size:14px;
    font-weight:500;cursor:pointer}
  button:hover{background:var(--teal-dark)}
  button:disabled{opacity:.6;cursor:default}
  .err{color:#a32d2d;font-size:12.5px;min-height:16px;margin-top:2px}
</style>
</head>
<body>
  <div class="card">
    <div class="mark">T</div>
    <h1>Tenderfy — Visual sitemap</h1>
    <p>This site is password protected.</p>
    <form id="f">
      <input id="p" type="password" placeholder="Password" autocomplete="current-password" autofocus>
      <button id="b" type="submit">Unlock</button>
      <div class="err" id="e"></div>
    </form>
  </div>
<script>
const CFG = ${JSON.stringify(CFG)};
const KEY = "tenderfy_sitemap_unlock";
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decrypt(pw){
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name:"PBKDF2", salt:b64(CFG.salt), iterations:CFG.iter, hash:"SHA-256" },
    base, { name:"AES-GCM", length:256 }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv:b64(CFG.iv) }, key, b64(CFG.data));
  return new TextDecoder().decode(plain);
}
function render(htmlStr){ document.open(); document.write(htmlStr); document.close(); }
async function unlock(pw, remember){
  const html = await decrypt(pw);              // throws if password is wrong (GCM auth fail)
  if (remember) try { sessionStorage.setItem(KEY, pw); } catch(e){}
  render(html);
}
const f = document.getElementById("f"), p = document.getElementById("p"),
      e = document.getElementById("e"), b = document.getElementById("b");
f.addEventListener("submit", async ev => {
  ev.preventDefault(); e.textContent = ""; b.disabled = true; b.textContent = "Unlocking…";
  try { await unlock(p.value, true); }
  catch(err){ e.textContent = "Wrong password."; b.disabled = false; b.textContent = "Unlock"; p.select(); }
});
// auto-unlock within the same tab session
(async () => { const s = sessionStorage.getItem(KEY); if (s) { try { await unlock(s, false); } catch(e){ sessionStorage.removeItem(KEY); } } })();
</script>
</body>
</html>
`;

// 5. write --------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), gate);
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log('Built docs/index.html');
console.log('  screenshots inlined : ' + inlined);
console.log('  plaintext size      : ' + kb(Buffer.byteLength(html)));
console.log('  encrypted page size : ' + kb(Buffer.byteLength(gate)));
console.log('  password            : ' + PASSWORD);
