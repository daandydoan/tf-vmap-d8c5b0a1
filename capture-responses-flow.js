// Fill in screenshots for the distinct MODALS/states used in the Responses
// flow map (Add Question & Response, AI Enhancement, Edit Response, bulk
// row selection). Non-interactive — reuses the saved login in .pw-profile.
//
//   node capture-responses-flow.js
//
// Every modal is closed with Escape (falling back to a Cancel button if
// present) — never the destructive/submit action — so nothing is created,
// changed, or deleted on the account. Bulk selection is toggled back off
// before moving on.

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = 'https://stgbusinessadmin.tenderfy.org';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE = path.join(__dirname, '.pw-profile');

async function closeModal(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {});
  await page.waitForTimeout(400);
}

async function shoot(page, file) {
  await page.waitForTimeout(1000);
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

  // 1. Add Question & Response modal --------------------------------------------
  try {
    await page.goto(`${BASE}/responses`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Add Response', exact: true }).click();
    await shoot(page, 'modal-add-response');
    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-add-response  (' + e.message.split('\n')[0] + ')'); }

  // 2. Edit Response modal + 3. its AI Enhancement composer --------------------
  try {
    await page.goto(`${BASE}/responses`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await shoot(page, 'modal-edit-response');

    await page.getByText('AI Enhancement', { exact: true }).click();
    await shoot(page, 'modal-ai-enhancement');

    await closeModal(page);
  } catch (e) { console.log('  SKIP   modal-edit-response/modal-ai-enhancement  (' + e.message.split('\n')[0] + ')'); }

  // 4. Bulk selection — row checkbox reveals Delete Selected / Add to Folder ---
  try {
    await page.goto(`${BASE}/responses`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1200);
    const checkbox = page.getByRole('checkbox').first();
    await checkbox.click();
    await shoot(page, 'responses-bulk');
    await checkbox.click(); // deselect — leave the account exactly as found
    await page.waitForTimeout(300);
  } catch (e) { console.log('  SKIP   responses-bulk  (' + e.message.split('\n')[0] + ')'); }

  console.log('\nDone. Run `PLAIN=1 node build.js` to refresh docs/index.html.');
  await ctx.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
