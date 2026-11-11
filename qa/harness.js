// Shared Playwright harness for tracker QA.
// SAFETY: every run blocks the live database and the database client library,
// so the page always runs in "local mode" and can never read or change practice records.
// State comes only from qa/fixtures/synthetic-state.json (invented data).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'synthetic-state.json'), 'utf8'));
delete FIXTURE._comment;

// Optional: path to a local lucide UMD build, for networks where unpkg is blocked.
const LUCIDE_LOCAL = process.env.LUCIDE_LOCAL || '';

async function openTracker({ width = 1440, height = 900, file = 'index.html', seed = true, reducedMotion = false, scale = 1 } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.route(/supabase\.co/, (r) => r.abort());                 // live database: never
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (r) => r.abort()); // client library: never
  await page.route(/\.(png|jpe?g)$/i, (r) => r.abort());              // practice/team photos stay out of captures
  if (LUCIDE_LOCAL) {
    const body = fs.readFileSync(LUCIDE_LOCAL);
    await page.route(/unpkg\.com\/lucide/, (r) => r.fulfill({ contentType: 'application/javascript', body }));
  }
  await page.goto('file://' + path.join(ROOT, file), { waitUntil: 'load' });
  if (seed) {
    // Seed once, then reload so the app starts from the synthetic state. Later reloads keep whatever the test saved.
    await page.evaluate((state) => localStorage.setItem('dr_tebeila_app_v2', JSON.stringify(state)), FIXTURE);
    errors.length = 0;
    await page.reload({ waitUntil: 'load' });
  }
  await page.waitForTimeout(700);
  return { browser, context, page, errors };
}

async function gotoTab(page, tabId) {
  await page.evaluate((t) => { switchTab(t); window.scrollTo(0, 0); }, tabId);
  await page.waitForTimeout(450);
}

module.exports = { openTracker, gotoTab, ROOT, FIXTURE };
