// Sign-in checks. Run: node qa/auth.js
// Uses the stand-in Supabase client from harness.js: invented accounts, invented notes, no network.
const { openTracker, gotoTab } = require('./harness');
const out = [];
const check = (name, ok, detail = '') => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };
const USERS = { 'team@example.test': 'correct-horse-battery' };
const ROWS = [
  { milestone_id: 1, status: 'A', updated_at: '2026-11-10T08:00:00.000Z', metadata: {}, comments: [{ text: 'Synthetic private note one', date: '02 Nov 2026, 09:15', type: 'team' }] },
  { milestone_id: 2, status: 'B', updated_at: '2026-11-09T08:00:00.000Z', metadata: {}, comments: [{ text: 'Synthetic private note two', date: '03 Nov 2026, 10:00', type: 'coach' }] },
];
const locked = (p) => p.evaluate(() => ({
  state: document.documentElement.getAttribute('data-auth'),
  gate: getComputedStyle(document.getElementById('auth-gate')).display !== 'none',
  appHidden: getComputedStyle(document.querySelector('.app-shell')).display === 'none',
  rendered: document.getElementById('stats-container').children.length + document.getElementById('milestone-container').children.length + document.getElementById('notes-container').children.length + document.getElementById('focus-section').children.length,
  selects: window.__cloud ? window.__cloud.selects : -1,
  pageText: document.body.innerText,
}));

(async () => {
  // ---- 1. A visitor who is not signed in
  let s = await openTracker({ seed: false, cloud: { session: false, users: USERS, rows: ROWS, rls: true } }); let p = s.page;
  let st = await locked(p);
  check('not signed in: the sign-in screen is shown and the tracker is hidden', st.state === 'locked' && st.gate && st.appHidden, JSON.stringify({ state: st.state, gate: st.gate, appHidden: st.appHidden }));
  check('not signed in: nothing from the tracker is drawn and the database is not asked for anything', st.rendered === 0 && st.selects === 0, `rendered ${st.rendered}, reads ${st.selects}`);
  check('not signed in: no goal, owner or note text is visible on screen', !/Register Trade Name|Financial Audit|private note|Leadership Actions/i.test(st.pageText));
  check('the cursor starts in the email field', await p.evaluate(() => document.activeElement.id === 'auth-email'));

  await p.locator('#auth-submit').click();
  check('empty form: asks for email and password, stays locked', /Enter your email and password/.test(await p.locator('#auth-error').textContent()) && (await locked(p)).state === 'locked');

  await p.fill('#auth-email', 'team@example.test'); await p.fill('#auth-password', 'wrong-password'); await p.locator('#auth-submit').click(); await p.waitForTimeout(250);
  st = await locked(p);
  check('wrong password: clear message, still locked, nothing loaded', /not right/.test(await p.locator('#auth-error').textContent()) && st.state === 'locked' && st.appHidden && st.selects === 0 && st.rendered === 0);
  check('wrong password: the password box is emptied and the message is announced to screen readers', (await p.inputValue('#auth-password')) === '' && (await p.getAttribute('#auth-error', 'role')) === 'alert');
  await p.fill('#auth-email', 'stranger@example.test'); await p.fill('#auth-password', 'correct-horse-battery'); await p.locator('#auth-submit').click(); await p.waitForTimeout(250);
  check('unknown email: same message as a wrong password (does not reveal which accounts exist)', /not right/.test(await p.locator('#auth-error').textContent()) && (await locked(p)).state === 'locked');

  await p.fill('#auth-password', 'abc');
  await p.locator('#auth-show').click();
  const shown = await p.evaluate(() => [document.getElementById('auth-password').type, document.getElementById('auth-show').getAttribute('aria-pressed'), document.getElementById('auth-show').textContent]);
  await p.locator('#auth-show').click();
  check('Show / Hide reveals and hides the password', shown.join() === 'text,true,Hide' && (await p.getAttribute('#auth-password', 'type')) === 'password');
  check('fields work with password managers (autocomplete hints) and have labels', await p.evaluate(() => document.getElementById('auth-email').autocomplete === 'username' && document.getElementById('auth-password').autocomplete === 'current-password' && !!document.querySelector('label[for="auth-email"]') && !!document.querySelector('label[for="auth-password"]')));

  // ---- 2. Signing in with the keyboard only
  await p.fill('#auth-email', ''); await p.focus('#auth-email');
  await p.keyboard.type('team@example.test'); await p.keyboard.press('Tab'); await p.keyboard.type('correct-horse-battery'); await p.keyboard.press('Enter');
  await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ state: document.documentElement.getAttribute('data-auth'), gate: getComputedStyle(document.getElementById('auth-gate')).display, app: getComputedStyle(document.querySelector('.app-shell')).display, selects: window.__cloud.selects, stats: document.querySelectorAll('#stats-container .stat-num').length, sync: document.getElementById('sync-label').textContent, title: document.getElementById('sign-out-btn').title }));
  check('right email and password (typed, Tab, Enter): the tracker opens', st.state === 'open' && st.gate === 'none' && st.app !== 'none' && st.stats === 4, JSON.stringify(st));
  check('after sign-in the data loads from the database and reports Synced', st.selects === 1 && /synced/i.test(st.sync), JSON.stringify(st));
  check('the Sign out button says who is signed in', /team@example\.test/.test(st.title));
  await gotoTab(p, 'notes');
  check('signed in: notes from the database are shown', await p.evaluate(() => document.querySelectorAll('#notes-container > div').length === 2 && /private note one/.test(document.getElementById('notes-container').textContent)));
  await gotoTab(p, 'milestones');
  await p.evaluate(() => { const c = document.getElementById('m-card-1'); if (!c.classList.contains('open')) toggleCard(1); });
  await p.fill('#comment-in-1', 'Synthetic note added while signed in'); await p.locator('#m-card-1 .comment-input-area .save-note-btn').click(); await p.waitForTimeout(300);
  const up = await p.evaluate(() => window.__cloud.upserts);
  check('signed in: saving works and sends the same record shape as before', up.length === 1 && Object.keys(up[0].row).sort().join(',') === 'comments,metadata,milestone_id,status,updated_at' && up[0].row.comments.length === 2);

  // ---- 3. Staying signed in, then signing out
  await p.reload(); await p.waitForTimeout(800);
  check('reloading keeps you signed in', await p.evaluate(() => document.documentElement.getAttribute('data-auth') === 'open'));
  check('there is a Sign out control', await p.locator('#sign-out-btn').isVisible());
  await p.locator('#sign-out-btn').click(); await p.waitForTimeout(900);
  st = await locked(p);
  const leftovers = await p.evaluate(() => ({ data: localStorage.getItem('dr_tebeila_app_v2'), tokens: Object.keys(localStorage).filter((k) => /^sb-.*-auth-token/.test(k)).length, theme: localStorage.getItem('dr_tebeila_theme') }));
  check('Sign out returns to the sign-in screen with the tracker hidden and nothing drawn', st.state === 'locked' && st.appHidden && st.rendered === 0, JSON.stringify({ state: st.state, rendered: st.rendered }));
  check('Sign out clears the copy of the tracker data and the session kept in this browser', leftovers.data === null && leftovers.tokens === 0, JSON.stringify(leftovers));
  await p.reload(); await p.waitForTimeout(700);
  check('after signing out, reloading does not let you back in', (await locked(p)).state === 'locked');
  check('no script errors through sign-in, use and sign-out', s.errors.length === 0, s.errors.join(' | '));
  await s.browser.close();

  // ---- 4. Someone forces the page open without signing in
  s = await openTracker({ seed: false, cloud: { session: false, users: USERS, rows: ROWS, rls: true } }); p = s.page;
  await p.evaluate(() => { document.documentElement.setAttribute('data-auth', 'open'); initApp(); }); await p.waitForTimeout(700);
  const forced = await p.evaluate(async () => { switchTab('notes'); const notes = document.querySelectorAll('#notes-container .note-card').length; updateMilestone(1, { status: 'B' }); await new Promise((r) => setTimeout(r, 300)); return { notes, saved: window.__cloud.upserts.length, label: document.getElementById('sync-label').textContent }; });
  check('forced open without signing in: with row-level security the database returns no notes and refuses the save', forced.notes === 0 && forced.saved === 0 && /fail/i.test(forced.label), JSON.stringify(forced));
  await s.browser.close();

  // ---- 5. Things going wrong
  s = await openTracker({ seed: false, cloud: { session: false, users: USERS, authFail: 'network' } }); p = s.page;
  await p.fill('#auth-email', 'team@example.test'); await p.fill('#auth-password', 'correct-horse-battery'); await p.locator('#auth-submit').click(); await p.waitForTimeout(300);
  check('no connection while signing in: says so, button usable again, still locked', /Could not reach the sign-in service/.test(await p.locator('#auth-error').textContent()) && !(await p.locator('#auth-submit').isDisabled()) && (await locked(p)).state === 'locked');
  await s.browser.close();

  s = await openTracker({ seed: false, cloud: 'none' }); p = s.page;
  const un = await p.evaluate(() => ({ state: document.documentElement.getAttribute('data-auth'), mode: document.getElementById('auth-gate').getAttribute('data-mode'), msg: document.getElementById('auth-error').textContent, btn: document.getElementById('auth-submit').textContent, fields: getComputedStyle(document.querySelector('.auth-field')).display, appHidden: getComputedStyle(document.querySelector('.app-shell')).display === 'none', rendered: document.getElementById('stats-container').children.length }));
  check('sign-in service cannot be loaded: explains, offers Try again, and does not open the tracker', un.state === 'locked' && un.mode === 'unavailable' && /could not be loaded/.test(un.msg) && un.btn === 'Try again' && un.fields === 'none' && un.appHidden && un.rendered === 0, JSON.stringify(un));
  await s.browser.close();

  // ---- 6. Phone
  for (const w of [390, 360]) {
    s = await openTracker({ width: w, height: 780, seed: false, cloud: { session: false, users: USERS } }); p = s.page;
    const m = await p.evaluate(() => { const els = [...document.querySelectorAll('#auth-form input, #auth-form button')].map((e) => e.getBoundingClientRect()); const card = document.getElementById('auth-form').getBoundingClientRect(); return { over: document.documentElement.scrollWidth - window.innerWidth, minH: Math.min(...els.map((b) => b.height)), fits: card.left >= 0 && card.right <= window.innerWidth, font: parseFloat(getComputedStyle(document.getElementById('auth-email')).fontSize) }; });
    check(`sign-in screen at ${w}px: fits, controls at least 40px tall, 16px input text (no zoom jump on iPhone)`, m.over <= 1 && m.fits && m.minH >= 40 && m.font >= 16, JSON.stringify(m));
    await s.browser.close();
  }
  s = await openTracker({ width: 390, height: 844 }); p = s.page;
  check('signed in on a phone: Sign out is reachable and at least 44px', await p.evaluate(() => { const b = document.getElementById('sign-out-btn').getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && b.right <= window.innerWidth; }));
  await s.browser.close();

  const failed = out.filter((x) => !x).length;
  console.log(`\n${out.length - failed}/${out.length} passed`);
  process.exit(failed ? 1 : 0);
})();
