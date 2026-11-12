// Cloud-path checks: does the page read, show and save notes correctly when the data comes from the database?
// Uses a stand-in database inside the browser (see fakeSupabaseScript in harness.js). The real database is
// blocked, and every note below is invented. Run: node qa/cloud-path.js [file]
const { openTracker, gotoTab } = require('./harness');
const file = process.argv[2] || 'index.html';
const out = [];
const check = (name, ok, detail = '') => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };

// Rows shaped the way the page itself writes them, including older shapes it may have written in the past.
const ROWS = [
  { milestone_id: 1, status: 'A', updated_at: '2026-11-10T08:00:00.000Z', metadata: { reasonForDelay: 'Synthetic reason' },
    comments: [{ text: 'Synthetic cloud note A (team)', date: '02 Nov 2026, 09:15', type: 'team' }, { text: 'Synthetic cloud note B (coach)', date: '03 Nov 2026, 10:00', type: 'coach' }] },
  { milestone_id: 2, status: 'G', updated_at: '2026-11-09T08:00:00.000Z', metadata: null,
    comments: [{ text: 'Synthetic older note with no type', date: '14 Apr 2026, 11:20' }, { text: 'Synthetic edited note', date: '20 Apr 2026, 08:05 (edited)', type: 'team' }] },
  { milestone_id: '3', status: 'R', updated_at: null, metadata: {}, comments: null },
  { milestone_id: 6, status: 'B', updated_at: '2026-05-10T14:45:00.000Z', metadata: { achieved_at: '2026-05-10', evidence: 'Synthetic legacy evidence key' },
    comments: [{ text: 'Synthetic note with symbols: R1,500 & 50% <done> "quoted"', date: '10 May 2026, 16:45', type: 'team' }] },
  { milestone_id: 14, status: 'G', updated_at: '2026-11-01T08:00:00.000Z', metadata: {}, comments: [{ text: 'Synthetic O.C.E note', date: '01 Nov 2026, 12:00', type: 'coach' }] },
];
const TOTAL = ROWS.reduce((n, r) => n + (r.comments || []).length, 0);

(async () => {
  // ---- 1. Database has notes, this browser has nothing saved locally (first visit on a new device or link)
  let s = await openTracker({ file, seed: false, cloud: { rows: ROWS } }); let p = s.page;
  await p.waitForTimeout(500);
  check('connects and reports Synced', /synced/i.test(await p.locator('#sync-label').textContent()), await p.locator('#sync-label').textContent());
  await gotoTab(p, 'milestones');
  await p.evaluate(() => { document.querySelectorAll('.milestone-card.open').forEach((c) => c.classList.remove('open')); toggleCard(1); toggleCard(2); });
  await p.waitForTimeout(400);
  const inGoals = await p.evaluate(() => ({ g1: document.querySelectorAll('#m-card-1 .comment-entry').length, g2: document.querySelectorAll('#m-card-2 .comment-entry').length, badge1: document.querySelector('#m-card-1 .comment-badge').textContent.trim() }));
  check('Goals view shows the notes that came from the database', inGoals.g1 === 2 && inGoals.g2 === 2 && inGoals.badge1 === '2', JSON.stringify(inGoals));
  await gotoTab(p, 'notes');
  const inAll = await p.evaluate(() => ({ n: document.querySelectorAll('#notes-container > div').length, text: document.getElementById('notes-container').textContent, visible: [...document.querySelectorAll('#notes-container > div')].every((d) => d.getBoundingClientRect().height > 20) }));
  check(`All Notes shows every note from the database (${TOTAL})`, inAll.n === TOTAL && inAll.visible, `${inAll.n} shown`);
  check('All Notes includes team, coach, older (no type) and edited notes', ['cloud note A', 'cloud note B', 'older note with no type', 'edited note', 'O.C.E note'].every((t) => inAll.text.includes(t)));
  check('a note opened from All Notes leads to its goal', await p.evaluate(async () => { document.querySelector('#notes-container .note-goal, #notes-container [onclick*="toggleCard"]').click(); await new Promise((r) => setTimeout(r, 400)); return document.getElementById('view-milestones').classList.contains('active'); }));
  await gotoTab(p, 'projects');
  check('Ownership Board shows the note counts from the database', await p.evaluate(() => { const row = [...document.querySelectorAll('.projects-table tbody tr')].find((r) => r.querySelector('.pt-id').textContent.trim() === '1'); return row && row.querySelector('.pt-notes-count').textContent.trim() === '2'; }));
  await gotoTab(p, 'dashboard');
  check('statuses from the database drive the Overview numbers', await p.evaluate(() => Number(document.querySelectorAll('#stats-container .stat-num')[1].textContent) === 1 && Number(document.querySelectorAll('#stats-container .stat-num')[3].textContent) === 2));

  // ---- 2. Saving goes to the database in the shape the table expects
  await gotoTab(p, 'milestones');
  await p.evaluate(() => { const c = document.getElementById('m-card-1'); if (!c.classList.contains('open')) toggleCard(1); });
  await p.fill('#comment-in-1', 'Synthetic note typed during the test'); await p.locator('#m-card-1 .comment-input-area .save-note-btn').click(); await p.waitForTimeout(300);
  const up = await p.evaluate(() => window.__cloud.upserts);
  const last = up[up.length - 1] || {};
  check('adding a note sends one save to the database', up.length === 1, String(up.length));
  check('the save has exactly the expected fields', last.row && Object.keys(last.row).sort().join(',') === 'comments,metadata,milestone_id,status,updated_at' && last.opts && last.opts.onConflict === 'milestone_id', JSON.stringify(last.row && Object.keys(last.row)));
  check('the save keeps the existing notes and appends the new one', last.row && last.row.milestone_id === 1 && last.row.comments.length === 3 && last.row.comments[2].text === 'Synthetic note typed during the test' && last.row.comments[2].type === 'team' && last.row.comments[0].text === ROWS[0].comments[0].text);
  check('the save keeps status and accountability details', last.row && last.row.status === 'A' && last.row.metadata.reasonForDelay === 'Synthetic reason');
  await gotoTab(p, 'notes');
  check('the new note appears in All Notes straight away, newest first', await p.evaluate((t) => document.querySelectorAll('#notes-container > div').length === t + 1, TOTAL));
  await p.evaluate(() => updateMilestone(3, { status: 'G' })); await p.waitForTimeout(200);
  const up2 = await p.evaluate(() => window.__cloud.upserts.slice(-1)[0].row);
  check('a status change is saved for the right goal', up2.milestone_id === 3 && up2.status === 'G' && Array.isArray(up2.comments));

  // ---- 3. A change made on another device arrives live
  await p.evaluate(() => window.__cloud.emit({ milestone_id: 5, status: 'A', comments: [{ text: 'Synthetic note from another device', date: '12 Nov 2026, 09:00', type: 'coach' }], metadata: {} }));
  await p.waitForTimeout(300);
  check('a live update from another device appears in All Notes without reloading', await p.evaluate(() => document.getElementById('notes-container').textContent.includes('note from another device')));
  check('no script errors in cloud mode', s.errors.length === 0, s.errors.join(' | '));
  await s.browser.close();

  // ---- 4. Database unreachable (for example a paused project)
  for (const [mode, label] of [['throw', 'cannot be reached'], ['error', 'answers with an error']]) {
    s = await openTracker({ file, seed: false, cloud: { rows: ROWS, fail: mode } }); p = s.page;
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => { switchTab('notes'); return { label: document.getElementById('sync-label').textContent, notes: document.getElementById('notes-container').textContent, cards: (switchTab('milestones'), document.querySelectorAll('.milestone-card').length) }; });
    check(`database ${label}: the page says so and still works`, /offline|failed/i.test(st.label) && st.cards === 16, JSON.stringify(st.label));
    check(`database ${label}: no notes are shown anywhere, because none are stored in this browser`, /No notes have been recorded yet/.test(st.notes));
    await s.browser.close();
  }
  const failed = out.filter((x) => !x).length;
  console.log(`\n${out.length - failed}/${out.length} passed`);
  process.exit(failed ? 1 : 0);
})();
