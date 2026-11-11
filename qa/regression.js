// Functional regression tests for the tracker. Run: node qa/regression.js [file]
// Runs on synthetic data in local mode only (see harness.js). Never touches live records.
// The same script is run against the pre-redesign baseline and the redesign, so it only
// relies on behaviour and on ids/classes that exist in both.
const fs = require('fs');
const { openTracker, gotoTab, FIXTURE } = require('./harness');

const file = process.argv[2] || 'index.html';
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  -> ' + detail}`);
}
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dr_tebeila_app_v2')));

(async () => {
  const { browser, page, errors } = await openTracker({ width: 1440, height: 900, file });
  const liveCalls = [];
  page.on('request', (r) => { if (/supabase\.co/.test(r.url())) liveCalls.push(r.url()); });
  page.on('dialog', async (d) => { if (d.type() === 'prompt') await d.accept('Synthetic QA note: edited text'); else await d.accept(); });

  // Expected numbers, computed independently from the fixture and the page's own goal list.
  const exp = await page.evaluate((fx) => {
    const st = (id) => (fx[id] && fx[id].status) || 'Grey';
    const closed = ['B', 'P', 'C', 'D'];
    const due = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
    const overdue = INIT_DATA.filter((m) => !closed.includes(st(m.id)) && due(m.short.due) < new Date());
    const count = (k) => INIT_DATA.filter((m) => st(m.id) === k).length;
    return {
      total: INIT_DATA.length,
      active: INIT_DATA.length - count('C') - count('D'),
      achieved: count('B'),
      actionNeeded: count('R') + count('A'),
      overdue: overdue.length,
      gaps: overdue.filter((m) => !(fx[m.id] && fx[m.id].metadata && fx[m.id].metadata.reasonForDelay)).length,
      oce: INIT_DATA.filter((m) => m.programme === 'O.C.E — Phase One').map((m) => m.id),
      notes: INIT_DATA.reduce((n, m) => n + ((fx[m.id] && fx[m.id].comments) || []).length, 0),
      governance: INIT_DATA.filter((m) => m.area === 'Governance').length,
      onTrack: count('G'),
    };
  }, FIXTURE);

  // ---- Shell / navigation
  check('page loads with no script errors', errors.length === 0, errors.join(' | '));
  for (const t of ['dashboard', 'projects', 'milestones', 'timeline', 'notes']) {
    await gotoTab(page, t);
    const ok = await page.evaluate((t) => {
      const v = document.getElementById('view-' + t);
      return v.classList.contains('active') && getComputedStyle(v).display !== 'none' && document.querySelectorAll('.page.active').length === 1;
    }, t);
    check(`view "${t}" opens and is the only visible view`, ok);
  }
  const navActive = await page.evaluate(() => { switchTab('timeline'); const b = document.querySelectorAll('.tab-btn'); return b.length === 5 && b[3].classList.contains('active') && document.querySelectorAll('.tab-btn.active').length === 1; });
  check('navigation highlights the current view', navActive);
  const badges = await page.evaluate(() => [document.getElementById('overdue-badge').textContent, document.getElementById('overdue-badge-ob').textContent]);
  check('overdue badges match state', badges.every((b) => Number(b) === exp.overdue), `${badges} vs ${exp.overdue}`);

  // ---- Overview
  await gotoTab(page, 'dashboard');
  const stats = await page.evaluate(() => [...document.querySelectorAll('#stats-container .stat-num')].map((e) => Number(e.textContent.trim())));
  check('metric row: Active Goals from state', stats[0] === exp.active, `${stats[0]} vs ${exp.active}`);
  check('metric row: Achieved from state', stats[1] === exp.achieved, `${stats[1]} vs ${exp.achieved}`);
  check('metric row: Reporting Gaps from state', stats[2] === exp.gaps, `${stats[2]} vs ${exp.gaps}`);
  check('metric row: Action Needed from state', stats[3] === exp.actionNeeded, `${stats[3]} vs ${exp.actionNeeded}`);
  const focus = await page.evaluate(() => document.querySelectorAll('#focus-section .focus-item').length);
  check("Today's Focus lists up to 3 real goals", focus === 3, String(focus));
  const oceText = await page.evaluate(() => document.getElementById('oce-roadmap-panel').textContent);
  check('O.C.E roadmap present, Phase 1 marked active, later phases listed', /O\.C\.E Programme Roadmap/.test(oceText) && /Phase 1[\s\S]*ACTIVE/.test(oceText) && /Phase 2/.test(oceText) && /Phase 4/.test(oceText) && (oceText.match(/ACTIVE/g) || []).length === 1);
  check('O.C.E Phase One goals are 11–16', exp.oce.join(',') === '11,12,13,14,15,16', exp.oce.join(','));
  const execPanels = await page.evaluate(() => ['project-narrative-panel', 'leadership-actions-panel', 'executive-bottlenecks-panel', 'strategic-health-panel'].map((id) => document.getElementById(id).textContent.trim().length > 20));
  check('narrative, leadership actions, bottlenecks, strategic health all render', execPanels.every(Boolean));
  const progLists = await page.evaluate(() => [document.querySelectorAll('#area-progress-list .prog-row').length, document.querySelectorAll('#status-progress-list .prog-row').length]);
  check('progress by area and status breakdown render', progLists[0] === 9 && progLists[1] >= 6, progLists.join(','));
  await page.evaluate(() => document.querySelector('#focus-section .focus-item').click());
  await page.waitForTimeout(500);
  check('clicking a focus item opens that goal', await page.evaluate(() => document.getElementById('view-milestones').classList.contains('active') && document.querySelectorAll('.milestone-card.open').length === 1));

  // ---- Exports
  await gotoTab(page, 'dashboard');
  for (const [fmt, name] of [['csv', 'Dr_Tebeila_Plan.csv'], ['txt', 'Dr_Tebeila_Summary.txt']]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate((f) => exportData(f), fmt)]);
    const body = fs.readFileSync(await dl.path(), 'utf8');
    const ok = dl.suggestedFilename() === name && (fmt === 'csv' ? body.trim().split('\n').length === exp.total + 1 && body.startsWith('ID,Milestone,Area,Status') : (body.match(/^\[\d+\]/gm) || []).length === exp.total);
    check(`export ${fmt.toUpperCase()} downloads with all goals`, ok, dl.suggestedFilename());
  }
  check('export buttons are present on the page', (await page.locator('button', { hasText: 'Export CSV' }).count()) === 1 && (await page.locator('button', { hasText: 'Export Summary Text' }).count()) === 1);

  // ---- Ownership Board
  await gotoTab(page, 'projects');
  const rows = () => page.evaluate(() => document.querySelectorAll('.projects-table tbody tr').length);
  check('board lists every goal', (await rows()) === exp.total, String(await rows()));
  await page.selectOption('#pf-phase', 'O.C.E — Phase One');
  check('board programme filter', (await rows()) === 6, String(await rows()));
  await page.selectOption('#pf-phase', 'all'); await page.selectOption('#pf-area', 'Governance');
  check('board area filter', (await rows()) === exp.governance, String(await rows()));
  await page.selectOption('#pf-area', 'all'); await page.selectOption('#pf-status', 'G');
  check('board status filter', (await rows()) === exp.onTrack, String(await rows()));
  await page.selectOption('#pf-status', 'all');
  const owner = await page.evaluate(() => document.querySelectorAll('#pf-owner option')[1].value);
  await page.selectOption('#pf-owner', owner);
  const ownerOk = await page.evaluate((o) => { const n = document.querySelectorAll('.projects-table tbody tr').length; return n > 0 && n === INIT_DATA.filter((m) => (m.assignee || '').split(' & ').map((s) => s.trim()).includes(o)).length; }, owner);
  check('board owner filter (partial owner match)', ownerOk);
  await page.selectOption('#pf-owner', 'all');
  const firstTitle = () => page.evaluate(() => document.querySelector('.projects-table tbody tr .pt-title').textContent);
  await page.evaluate(() => sortProjects('title')); const asc = await firstTitle();
  await page.evaluate(() => sortProjects('title')); const desc = await firstTitle();
  check('board sorts by column both ways', asc !== desc && asc < desc, `${asc} / ${desc}`);
  await page.evaluate(() => sortProjects('priority'));
  check('board summary strip counts all 8 statuses', await page.evaluate((t) => { const n = [...document.querySelectorAll('.projects-summary-strip .pss-num')].map((e) => Number(e.textContent)); return n.length === 8 && n.reduce((a, b) => a + b, 0) === t; }, exp.total));
  await page.locator('.projects-table tbody tr .ob-status-pill').first().click();
  check('board inline status menu opens', (await page.locator('.ob-status-dropdown.open').count()) === 1 && await page.locator('.ob-status-dropdown.open').isVisible());
  check('status menu offers all 8 existing status labels', await page.evaluate(() => { const o = [...document.querySelectorAll('.ob-status-dropdown.open .ob-status-option')].map((e) => e.textContent.trim()); return o.length === 8 && Object.values(STATUS_MAP).every((s) => o.includes(s.label)); }));
  await page.evaluate(() => obSetStatus(4, 'G'));
  check('board inline status change is saved', (await stored(page))['4'].status === 'G' && !!(await stored(page))['4'].lastUpdated);
  await page.evaluate(() => document.querySelectorAll('.milestone-card.open').forEach((c) => c.classList.remove('open')));
  await page.locator('.projects-table tbody tr .pt-title').first().click(); await page.waitForTimeout(500);
  check('clicking a board row opens the goal', await page.evaluate(() => document.getElementById('view-milestones').classList.contains('active') && document.querySelectorAll('.milestone-card.open').length >= 1));

  // ---- Goals
  await gotoTab(page, 'milestones');
  const cards = () => page.evaluate(() => document.querySelectorAll('#milestone-container .milestone-card').length);
  check('goals view lists every goal', (await cards()) === exp.total, String(await cards()));
  await page.selectOption('#filter-phase', 'O.C.E — Phase One'); check('goals programme filter', (await cards()) === 6);
  await page.selectOption('#filter-phase', 'all'); await page.selectOption('#filter-area', 'HR');
  check('goals area filter', (await cards()) === await page.evaluate(() => INIT_DATA.filter((m) => m.area === 'HR').length));
  await page.selectOption('#filter-area', 'all'); await page.selectOption('#filter-status', 'D');
  check('goals status filter', (await cards()) === 1);
  await page.selectOption('#filter-status', 'C'); await page.selectOption('#filter-area', 'Marketing');
  check('goals empty state when nothing matches', (await cards()) === 0 && (await page.locator('#milestone-container .empty-state').count()) === 1);
  await page.selectOption('#filter-status', 'all'); await page.selectOption('#filter-area', 'all');
  await page.evaluate(() => { document.querySelectorAll('.milestone-card.open').forEach((c) => c.classList.remove('open')); });
  await page.locator('#m-card-3 .m-header').click(); await page.waitForTimeout(450);
  check('goal expands on click and its form is visible', await page.locator('#acc-strategy-3').isVisible());
  check('overdue goal shows Reason for Delay and Corrective Action', (await page.locator('#acc-reason-3').count()) === 1 && (await page.locator('#acc-corrective-3').count()) === 1);
  await page.fill('#acc-strategy-3', 'Synthetic strategy');
  await page.selectOption('#acc-responsible-3', '__other__');
  check('"Other" responsible person reveals free-text field', await page.locator('#acc-responsible-other-3').isVisible());
  await page.fill('#acc-responsible-other-3', 'Synthetic Person');
  await page.fill('#acc-reason-3', 'Synthetic delay reason'); await page.fill('#acc-corrective-3', 'Synthetic fix');
  await page.locator('#m-card-3 .accountability-section .save-note-btn').click();
  const m3 = (await stored(page))['3'].metadata;
  check('accountability form saves all fields', m3.strategyNorthStar === 'Synthetic strategy' && m3.responsiblePerson === 'Synthetic Person' && m3.responsiblePersonMode === 'other' && m3.reasonForDelay === 'Synthetic delay reason' && m3.correctiveAction === 'Synthetic fix', JSON.stringify(m3));
  check('goal offers all 8 status buttons', (await page.locator('#m-card-3 .status-btn-selector').count()) === 8);
  await page.locator('#m-card-3 .status-btn-selector', { hasText: 'Completed' }).click(); await page.waitForTimeout(300);
  check('status button saves and goal stays open', (await stored(page))['3'].status === 'B' && (await page.locator('#m-card-3.open').count()) === 1);
  check('completed goal shows Achieved Date and Success Evidence', (await page.locator('#acc-achieved-3').count()) === 1 && (await page.locator('#acc-evidence-3').count()) === 1);
  await page.fill('#comment-in-3', 'Synthetic QA note: team note'); await page.locator('#m-card-3 .comment-input-area .save-note-btn').click();
  await page.locator('#nf-coach-3').click(); await page.fill('#comment-in-3', 'Synthetic QA note: coach note'); await page.press('#comment-in-3', 'Enter');
  let c3 = (await stored(page))['3'].comments;
  check('team and coach notes are saved with the right type', c3.length === 2 && c3[0].type === 'team' && c3[1].type === 'coach', JSON.stringify(c3));
  check('coach note filter shows only coach notes', (await page.locator('#m-card-3 .comment-entry').count()) === 1 && (await page.locator('#m-card-3 .comment-entry.note-coach').count()) === 1);
  await page.locator('#nf-all-3').click();
  await page.evaluate(() => editComment(3, 0)); c3 = (await stored(page))['3'].comments;
  check('note edit saves and is marked edited', c3[0].text === 'Synthetic QA note: edited text' && /edited/.test(c3[0].date));
  await page.evaluate(() => deleteComment(3, 0));
  check('note delete removes one note', (await stored(page))['3'].comments.length === 1);

  // ---- Timeline
  await gotoTab(page, 'timeline');
  const tl = await page.evaluate(() => {
    const bars = [...document.querySelectorAll('#timeline-container .gantt-bar')];
    const w = (id) => { const b = bars.find((b) => (b.getAttribute('onclick') || '').includes('toggleCard(' + id + ')')); return b ? b.getBoundingClientRect().width : 0; };
    const later = INIT_DATA.slice().sort((a, b) => (a.long.due < b.long.due ? 1 : -1))[0];
    const earlier = INIT_DATA.slice().sort((a, b) => (a.long.due > b.long.due ? 1 : -1))[0];
    return { n: bars.length, laterW: w(later.id), earlierW: w(earlier.id), differ: later.long.due !== earlier.long.due, months: document.querySelector('#timeline-container').textContent.match(/Apr 26|May 26|Mar 27/gi) };
  });
  check('timeline has one bar per goal', tl.n === exp.total, String(tl.n));
  check('timeline bars are positioned from real due dates', !tl.differ || tl.laterW > tl.earlierW, JSON.stringify(tl));
  check('timeline shows the month scale', tl.months && tl.months.length >= 2);
  await page.locator('#timeline-container .gantt-bar').first().click(); await page.waitForTimeout(450);
  check('clicking a timeline bar opens the goal', await page.evaluate(() => document.getElementById('view-milestones').classList.contains('active')));

  // ---- All Notes
  await gotoTab(page, 'notes');
  const noteCount = await page.evaluate(() => document.querySelectorAll('#notes-container > div').length);
  check('all notes lists every saved note', noteCount === exp.notes + 1, `${noteCount} vs ${exp.notes + 1}`);

  // ---- Persistence
  await page.reload(); await page.waitForTimeout(700);
  const after = await stored(page);
  check('state survives a reload (local storage key unchanged)', after['3'].status === 'B' && after['4'].status === 'G' && after['3'].comments.length === 1, JSON.stringify({ s3: after['3'].status, s4: after['4'].status, c3: after['3'].comments.length }));
  check('sync indicator present and reports local mode', /local/i.test(await page.locator('#sync-label').textContent()));
  check('no request was made to the live database', liveCalls.length === 0, liveCalls.join(','));
  check('no script errors during the whole run', errors.length === 0, errors.join(' | '));
  await browser.close();

  // ---- Responsive: no sideways page scroll
  for (const w of [1440, 1024, 768, 390, 360]) {
    const s = await openTracker({ width: w, height: 800, file });
    let worst = 0;
    for (const t of ['dashboard', 'projects', 'milestones', 'timeline', 'notes']) {
      await gotoTab(s.page, t);
      worst = Math.max(worst, await s.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    }
    check(`no horizontal page overflow at ${w}px`, worst <= 1, `${worst}px`);
    await s.browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (process.env.QA_JSON) fs.writeFileSync(process.env.QA_JSON, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
