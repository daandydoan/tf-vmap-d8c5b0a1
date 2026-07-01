// Fill in screenshots for the distinct MODALS used in the Tenders flow map
// (Create New Tender, Add Task, Add Notes, Delete Tender confirm, Add Tender
// Documents picker). Non-interactive — reuses the saved login in .pw-profile.
//
//   node capture-tender-flow.js
//
// Every modal is closed with Escape (falling back to a Cancel button if
// present) — never the destructive/submit action — so nothing is created,
// changed, or deleted on the account.

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = 'https://stgbusinessadmin.tenderfy.org';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE = path.join(__dirname, '.pw-profile');
const TENDER_ID = '4795171c-2871-4b49-a6b3-ca37077494ab'; // "Tender Pack"

async function closeModal(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
  await page.waitForTimeout(400);
}

async function shootModal(page, file) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SHOTS, `${file}.png`), fullPage: false });
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

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  if (page.url().includes('/auth/login')) {
    console.error('Not logged in — run `node capture.js` once to log in again.');
    await ctx.close();
    process.exit(1);
  }

  // 1. Create New Tender modal -------------------------------------------------
  try {
    await page.goto(`${BASE}/tenders`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: 'Create New Tender', exact: true }).click();
    await shootModal(page, 'modal-create-tender');
    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-create-tender  (' + e.message.split('\n')[0] + ')'); }

  // 2. Add Task modal -----------------------------------------------------------
  try {
    await page.goto(`${BASE}/tenders/tender-details/${TENDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Add Task', exact: true }).click();
    await shootModal(page, 'modal-add-task');
    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-add-task  (' + e.message.split('\n')[0] + ')'); }

  // 3. Add Notes modal -----------------------------------------------------------
  try {
    await page.goto(`${BASE}/tenders/tender-details/${TENDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Add Notes', exact: true }).click();
    await shootModal(page, 'modal-add-notes');
    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-add-notes  (' + e.message.split('\n')[0] + ')'); }

  // 4. Delete Tender confirm dialog (opened via the header kebab) --------------
  try {
    await page.goto(`${BASE}/tenders/tender-details/${TENDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.getByText('more_vert', { exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.getByText('Delete Tender', { exact: true }).click();
    await shootModal(page, 'modal-delete-tender');
    await closeModal(page); // Escape only — never the red "Delete tender" button
  } catch (e) { console.log('  SKIP   modal-delete-tender  (' + e.message.split('\n')[0] + ')'); }

  // sanity check: tender must still exist (Delete was never confirmed)
  try {
    const resp = await page.goto(`${BASE}/tenders/tender-details/${TENDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('  verify tender still exists: ' + (resp ? resp.status() : 'no response'));
  } catch (e) { console.log('  verify FAILED: ' + e.message.split('\n')[0]); }

  // 5. Add Tender Documents picker (on the Build Tender page) ------------------
  try {
    await page.goto(`${BASE}/tenders/build-tender/${TENDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.getByText('Add Tender Documents', { exact: true }).click();
    await shootModal(page, 'modal-add-category');
    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-add-category  (' + e.message.split('\n')[0] + ')'); }

  console.log('\nDone. Run `PLAIN=1 node build.js` to refresh docs/index.html.');
  await ctx.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
