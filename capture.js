// Capture full-page screenshots of every Tenderfy admin view into ./shots/
// Usage:
//   cd C:\Users\tieun\tenderfy-sitemap
//   npm init -y
//   npm i playwright-core
//   node capture.js
//
// Uses your installed Chrome (channel: 'chrome') with a persistent profile in
// ./.pw-profile, so you log in once and later runs reuse the session.

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const BASE = 'https://stgbusinessadmin.tenderfy.org';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE = path.join(__dirname, '.pw-profile');

// route-based views -> shots/<file>.png  (must match the sitemap slot names)
const routes = [
  { file: 'dashboard',            url: '/dashboard' },
  { file: 'tenders',              url: '/tenders' },
  { file: 'tenders-awarded',      url: '/tenders/awarded-tenders' },
  { file: 'tenders-unsuccessful', url: '/tenders/unsuccessful-tenders' },
  { file: 'responses',            url: '/responses' },
  { file: 'responses-ai',         url: '/responses?folderId=ai' },
  { file: 'fm-cover-pages',       url: '/file-manager/cover-pages' },
  { file: 'fm-toc',               url: '/file-manager/table-of-contents' },
  { file: 'fm-resumes',           url: '/file-manager/resumes' },
  { file: 'fm-case-studies',      url: '/file-manager/case-studies' },
  { file: 'fm-policies',          url: '/file-manager/policies' },
  { file: 'fm-insurances',        url: '/file-manager/insurances' },
  { file: 'fm-certifications',    url: '/file-manager/certifications' },
  { file: 'fm-org-chart',         url: '/file-manager/organization-chart' },
  { file: 'fm-others',            url: '/file-manager/others' },
  { file: 'staff-management',     url: '/manage-staff' },
  { file: 'role-management',      url: '/manage-staff/role-management' },
  { file: 'settings',             url: '/settings' },
  { file: 'ai-manager',           url: '/settings/ai-manager' },
];

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, a => { rl.close(); res(a); }));
}

async function shoot(page, file) {
  // let SPA route settle, then capture the full page
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(SHOTS, `${file}.png`), fullPage: true });
  console.log('  saved  shots/' + file + '.png');
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  console.log('\n================ LOGIN ================');
  console.log('A Chrome window opened. If it shows a login screen, log in now.');
  await ask('Once you can see the dashboard, press ENTER here to start capturing... ');

  console.log('\nCapturing route views:');
  for (const r of routes) {
    try {
      await page.goto(`${BASE}${r.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await shoot(page, r.file);
    } catch (e) {
      console.log('  SKIP   ' + r.file + '  (' + e.message.split('\n')[0] + ')');
    }
  }

  // Interactive views — let the human set them up, then capture on ENTER.
  console.log('\n================ INTERACTIVE VIEWS ================');
  await ask('1) Open any TENDER DETAILS page (click a tender name), then press ENTER... ');
  await shoot(page, 'tender-details');

  await ask('2) Click BUILD TENDER (top right of Tender Details), then press ENTER... ');
  await shoot(page, 'tender-build');

  await ask('3) Go back, select a document, and click OPEN RAY (so the chat panel shows), then press ENTER... ');
  await shoot(page, 'tender-ray');

  console.log('\nDone. ' + (routes.length + 3) + ' screenshots written to ./shots/');
  console.log('Open index.html to see them populate the sitemap.');
  await ctx.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
