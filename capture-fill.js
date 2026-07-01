// Fill in specific missing screenshots without any interactive prompts —
// reuses the saved login session in ./.pw-profile (set up by capture.js).
// Both targets here are plain URL routes, so no manual clicking is needed.
//
//   node capture-fill.js
//
// Add more entries to TARGETS as new placeholder slots show up in the sitemap.

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = 'https://stgbusinessadmin.tenderfy.org';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE = path.join(__dirname, '.pw-profile');

// known-good tender id with real attached documents ("Tender Pack")
const TENDER_ID = '4795171c-2871-4b49-a6b3-ca37077494ab';

const TARGETS = [
  { file: 'responses-ai', url: '/responses?folderId=ai' },
  { file: 'tender-build', url: `/tenders/build-tender/${TENDER_ID}` },
];

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = ctx.pages()[0] || await ctx.newPage();

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  if (page.url().includes('/auth/login')) {
    console.error('Not logged in — the saved session may have expired. Run `node capture.js` once to log in again.');
    await ctx.close();
    process.exit(1);
  }

  for (const t of TARGETS) {
    try {
      await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(SHOTS, `${t.file}.png`), fullPage: true });
      console.log('  saved  shots/' + t.file + '.png');
    } catch (e) {
      console.log('  SKIP   ' + t.file + '  (' + e.message.split('\n')[0] + ')');
    }
  }

  console.log('\nDone. Run `node build.js` (add PLAIN=1 for the no-password build) to refresh docs/index.html.');
  await ctx.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
