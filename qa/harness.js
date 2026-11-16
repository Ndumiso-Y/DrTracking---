// Shared Playwright harness for tracker QA.
// SAFETY: every run blocks the real database host, and replaces the Supabase client with a stand-in that
// lives inside the test browser. Nothing here can read or change practice records.
// State comes only from qa/fixtures/synthetic-state.json (invented data) or from rows a test passes in.
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'synthetic-state.json'), 'utf8'));
delete FIXTURE._comment;

// Optional: a local lucide UMD build, only needed when testing the pre-redesign baseline (it loads icons from unpkg).
const LUCIDE_LOCAL = process.env.LUCIDE_LOCAL || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

// Serves the repository over http://127.0.0.1 so the page runs as it does when published.
function startServer(file) {
  const entry = path.isAbsolute(file) ? file : path.join(ROOT, file);
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const target = (url === '/' || url === '/index.html') ? entry : path.join(ROOT, url);
      if (!target.startsWith(ROOT) && target !== entry) { res.writeHead(403); return res.end(); }
      fs.readFile(target, (err, body) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Stand-in for the Supabase client. It never talks to a network.
//   rows     what the "database" holds        fail     'throw' | 'error' to imitate an unreachable project
//   session  true = already signed in         users    { email: password } accepted by sign-in
//   rls      true = behave like row-level security: no session, no rows and no saves
//   authFail 'network' to make sign-in throw
function fakeSupabaseScript(cloud) {
  return `(function () {
  var KEY = 'sb-fake-auth-token';
  var cfg = ${JSON.stringify({ rows: cloud.rows || [], fail: cloud.fail || '', users: cloud.users || {}, rls: !!cloud.rls, authFail: cloud.authFail || '', startSignedIn: cloud.session !== false })};
  var stored = null; try { stored = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!stored && cfg.startSignedIn && !sessionStorage.getItem('__fake_auth_started')) { stored = { user: { email: 'tester@example.test' }, access_token: 'fake' }; localStorage.setItem(KEY, JSON.stringify(stored)); }
  sessionStorage.setItem('__fake_auth_started', '1');
  var listeners = [];
  window.__cloud = { rows: cfg.rows, fail: cfg.fail, upserts: [], selects: 0, handler: null, signIns: [] };
  var session = function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  window.supabase = { createClient: function () { return {
    auth: {
      getSession: async function () { return { data: { session: session() }, error: null }; },
      signInWithPassword: async function (c) {
        window.__cloud.signIns.push(c.email);
        if (cfg.authFail === 'network') throw new TypeError('Failed to fetch');
        if (cfg.users[c.email] !== undefined && cfg.users[c.email] === c.password) { var s = { user: { email: c.email }, access_token: 'fake' }; localStorage.setItem(KEY, JSON.stringify(s)); listeners.forEach(function (cb) { cb('SIGNED_IN', s); }); return { data: { session: s, user: s.user }, error: null }; }
        return { data: { session: null, user: null }, error: { message: 'Invalid login credentials', status: 400 } };
      },
      signOut: async function () { localStorage.removeItem(KEY); listeners.forEach(function (cb) { cb('SIGNED_OUT', null); }); return { error: null }; },
      onAuthStateChange: function (cb) { listeners.push(cb); return { data: { subscription: { unsubscribe: function () {} } } }; }
    },
    from: function () { return {
      select: async function () { window.__cloud.selects++; if (window.__cloud.fail === 'throw') throw new TypeError('Failed to fetch'); if (window.__cloud.fail === 'error') return { data: null, error: { message: 'project paused' } }; if (cfg.rls && !session()) return { data: [], error: null }; return { data: JSON.parse(JSON.stringify(window.__cloud.rows)), error: null }; },
      upsert: async function (row, opts) { if (cfg.rls && !session()) return { error: { message: 'new row violates row-level security policy' } }; window.__cloud.upserts.push({ row: JSON.parse(JSON.stringify(row)), opts: opts }); return { error: null }; } }; },
    channel: function () { return { on: function (ev, filter, cb) { window.__cloud.handler = cb; return this; }, subscribe: function () { return this; } }; } }; } };
  window.__cloud.emit = function (row) { if (window.__cloud.handler) window.__cloud.handler({ new: row }); };
})();`;
}

// cloud: undefined = stand-in, signed in, empty database (the page then uses the seeded browser state)
//        { ... }   = stand-in with the given options (see fakeSupabaseScript)
//        'none'    = the Supabase library cannot be loaded at all
async function openTracker({ width = 1440, height = 900, file = 'index.html', seed = true, reducedMotion = false, scale = 1, cloud = undefined, icons = true } = {}) {
  const server = await startServer(file);
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  browser.on('disconnected', () => server.close());
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: reducedMotion ? 'reduce' : 'no-preference', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.route(/supabase\.co/, (r) => r.abort()); // real database: never
  const lib = /cdn\.jsdelivr\.net\/npm\/@supabase|\/vendor\/supabase\.js/;
  if (cloud === 'none') await page.route(lib, (r) => r.abort());
  else await page.route(lib, (r) => r.fulfill({ contentType: 'application/javascript', body: fakeSupabaseScript(cloud || {}) }));
  await page.route(/\.(png|jpe?g)$/i, (r) => r.abort()); // practice and team photos stay out of captures
  if (!icons) await page.route(/unpkg\.com\/lucide|\/vendor\/lucide/, (r) => r.abort());
  else if (LUCIDE_LOCAL) { const body = fs.readFileSync(LUCIDE_LOCAL); await page.route(/unpkg\.com\/lucide/, (r) => r.fulfill({ contentType: 'application/javascript', body })); }

  await page.goto(origin + '/index.html', { waitUntil: 'load' });
  if (seed) {
    // Seed once, then reload so the app starts from the synthetic state. Later reloads keep whatever the test saved.
    await page.evaluate((state) => localStorage.setItem('dr_tebeila_app_v2', JSON.stringify(state)), FIXTURE);
    errors.length = 0;
    await page.reload({ waitUntil: 'load' });
  }
  await page.waitForTimeout(700);
  return { browser, context, page, errors, origin };
}

async function gotoTab(page, tabId) {
  await page.evaluate((t) => { switchTab(t); window.scrollTo(0, 0); }, tabId);
  await page.waitForTimeout(450);
}

module.exports = { openTracker, gotoTab, ROOT, FIXTURE };
