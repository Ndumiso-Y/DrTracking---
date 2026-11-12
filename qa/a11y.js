// Accessibility and resilience checks. Run: node qa/a11y.js
// Synthetic data, local mode only (see harness.js).
const { openTracker, gotoTab } = require('./harness');
const out = [];
const check = (name, ok, detail = '') => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };

(async () => {
  // ---- Keyboard
  let s = await openTracker({ width: 1440, height: 900 });
  let p = s.page;
  await p.keyboard.press('Tab');
  const first = await p.evaluate(() => ({ cls: document.activeElement.className, vis: getComputedStyle(document.activeElement).outlineStyle }));
  check('Tab lands on the first navigation button with a visible focus ring', /tab-btn/.test(first.cls) && first.vis !== 'none', JSON.stringify(first));
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('Enter on a navigation button switches view (Goals)', await p.evaluate(() => document.getElementById('view-milestones').classList.contains('active')));
  await p.focus('#m-card-2 .m-header'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('Enter expands a goal and aria-expanded follows', await p.evaluate(() => document.getElementById('m-card-2').classList.contains('open') && document.querySelector('#m-card-2 .m-header').getAttribute('aria-expanded') === 'true'));
  await p.keyboard.press(' '); await p.waitForTimeout(400);
  check('Space collapses it again', await p.evaluate(() => !document.getElementById('m-card-2').classList.contains('open') && document.querySelector('#m-card-2 .m-header').getAttribute('aria-expanded') === 'false'));
  check('a collapsed goal hides its form from view', await p.evaluate(() => document.getElementById('m-card-2').getBoundingClientRect().height < 140));
  await gotoTab(p, 'dashboard');
  await p.focus('#focus-section .focus-item'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  check("Enter on a Today's Focus item opens the goal", await p.evaluate(() => document.getElementById('view-milestones').classList.contains('active')));
  await gotoTab(p, 'timeline');
  await p.focus('#timeline-container .gantt-bar'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  check('Enter on a timeline bar opens the goal', await p.evaluate(() => document.getElementById('view-milestones').classList.contains('active')));
  await gotoTab(p, 'projects');
  await p.focus('.projects-table tbody tr .ob-status-pill'); await p.keyboard.press('Enter');
  check('Enter opens the board status menu', (await p.locator('.ob-status-dropdown.open').count()) === 1);
  const unlabeled = await p.evaluate(() => { const bad = []; ['dashboard', 'projects', 'milestones', 'timeline', 'notes'].forEach((t) => { switchTab(t); document.querySelectorAll('#view-' + t + ' select, #view-' + t + ' input, #view-' + t + ' textarea').forEach((el) => { const lab = el.getAttribute('aria-label') || (el.closest('.acc-field') && el.closest('.acc-field').querySelector('.acc-label')) || el.placeholder; if (!lab) bad.push(el.id || el.className); }); }); return bad; });
  check('every select, input and textarea has a label or accessible name', unlabeled.length === 0, unlabeled.join(','));
  check('exactly one h1 is visible per view', await p.evaluate(() => ['dashboard', 'projects', 'milestones', 'timeline', 'notes'].every((t) => { switchTab(t); return [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).length === 1; })));
  await s.browser.close();

  // ---- Timeline truth: marker positions equal the real calendar position of each due date
  s = await openTracker({ width: 1440, height: 900 }); p = s.page;
  await gotoTab(p, 'timeline');
  const truth = await p.evaluate(() => {
    const start = new Date(2026, 3, 1, 12), end = new Date(2027, 4, 1, 12);
    const expect = (iso) => { const [y, m, d] = iso.split('-').map(Number); return ((new Date(y, m - 1, d, 12) - start) / (end - start)) * 100; };
    const rows = [...document.querySelectorAll('#timeline-container .gantt-row:not(.gantt-header)')];
    let worst = 0;
    rows.forEach((row, i) => {
      const m = INIT_DATA[i];
      const marks = [...row.querySelectorAll('.gantt-mark')].map((e) => parseFloat(e.style.left));
      ['short', 'medium', 'long'].forEach((k, j) => { worst = Math.max(worst, Math.abs(marks[j] - expect(m[k].due))); });
      worst = Math.max(worst, Math.abs(parseFloat(row.querySelector('.gantt-bar').style.width) - expect(m.long.due)));
    });
    const today = document.querySelector('#timeline-container .gantt-today');
    const todayErr = today ? Math.abs(parseFloat(today.style.left) - ((new Date() - start) / (end - start)) * 100) : null;
    return { rows: rows.length, worst, todayErr, months: document.querySelectorAll('#timeline-container .gantt-month').length };
  });
  check('timeline: every bar end and due-date marker sits at its true calendar position', truth.rows === 16 && truth.worst < 0.01, JSON.stringify(truth));
  check('timeline: 13-month scale kept (Apr 2026 to Apr 2027) and the today marker is at the real date', truth.months === 13 && (truth.todayErr === null || truth.todayErr < 0.05), JSON.stringify(truth));
  const sticky = await p.evaluate(() => { const w = document.querySelector('#timeline-container .gantt-wrapper'); w.scrollLeft = 300; const c = document.querySelector('#timeline-container .gantt-row:nth-child(2) .sticky-col').getBoundingClientRect(); const wr = w.getBoundingClientRect(); return Math.abs(c.left - wr.left) < 3; });
  await s.browser.close();
  s = await openTracker({ width: 390, height: 844 }); p = s.page;
  await gotoTab(p, 'timeline');
  const mob = await p.evaluate(() => { const w = document.querySelector('#timeline-container .gantt-wrapper'); const can = w.scrollWidth > w.clientWidth; w.scrollLeft = 260; const c = document.querySelector('#timeline-container .gantt-row:nth-child(2) .sticky-col').getBoundingClientRect(); return { can, stuck: Math.abs(c.left - w.getBoundingClientRect().left) < 3, focusable: w.tabIndex === 0 }; });
  check('timeline on a phone: scrolls sideways inside its own frame, goal names stay pinned, frame is keyboard-focusable', mob.can && mob.stuck && mob.focusable && sticky, JSON.stringify(mob));
  const navOk = await p.evaluate(() => { switchTab('notes'); const b = document.querySelector('.tab-btn.active').getBoundingClientRect(); return b.left >= 0 && b.right <= window.innerWidth; });
  check('phone navigation keeps the active item on screen', navOk);
  const tap = await p.evaluate(() => [...document.querySelectorAll('.tab-btn')].every((b) => b.getBoundingClientRect().height >= 40));
  check('phone navigation targets are at least 40px tall', tap);
  await s.browser.close();

  // ---- Ease of use on a phone (thumb reach, target size, readable text)
  s = await openTracker({ width: 390, height: 844 }); p = s.page;
  const ease = await p.evaluate(() => {
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const btns = [...document.querySelectorAll('.tab-btn')].map((b) => b.getBoundingClientRect());
    return { bottom: Math.round(window.innerHeight - tabs.bottom), allVisible: btns.every((b) => b.left >= 0 && b.right <= window.innerWidth && b.height >= 44), labels: [...document.querySelectorAll('.tab-short')].map((e) => e.textContent).join(',') };
  });
  check('phone: all five views sit in a bar at the bottom of the screen, each at least 44px tall', ease.bottom === 0 && ease.allVisible && ease.labels === 'Overview,Board,Goals,Timeline,Notes', JSON.stringify(ease));
  let smallest = 999, smallName = '', tiny = 0;
  for (const t of ['dashboard', 'projects', 'milestones', 'timeline', 'notes']) {
    await gotoTab(p, t);
    if (t === 'milestones') { await p.evaluate(() => toggleCard(1)); await p.waitForTimeout(400); }
    const r = await p.evaluate(() => {
      let min = 999, name = '', tiny = 0;
      const roots = [document.querySelector('.sidebar'), document.querySelector('.app-header'), document.querySelector('.page.active')];
      roots.forEach((root) => root.querySelectorAll('button, select, input, textarea').forEach((el) => { const b = el.getBoundingClientRect(); if (!b.width) return; const m = Math.min(b.width, b.height); if (m < min) { min = m; name = el.className || el.tagName; } }));
      roots.forEach((root) => root.querySelectorAll('*').forEach((el) => { if (!el.getClientRects().length || el.closest('svg')) return; if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) return; if (parseFloat(getComputedStyle(el).fontSize) < 10) tiny++; }));
      return { min, name, tiny };
    });
    if (r.min < smallest) { smallest = r.min; smallName = t + ' .' + r.name; }
    tiny += r.tiny;
  }
  check('phone: every button, menu and field is at least 44px on its shorter side', smallest >= 43.5, `${Math.round(smallest)}px ${smallName}`);
  check('phone: no text smaller than 10px', tiny === 0, tiny + ' elements');
  await s.browser.close();

  // ---- All Notes order and goal reveal
  s = await openTracker({ width: 1440, height: 900 }); p = s.page;
  await gotoTab(p, 'notes');
  const order = await p.evaluate(() => [...document.querySelectorAll('#notes-container .note-meta')].map((e) => e.textContent.trim().slice(0, 11)));
  check('All Notes lists notes newest first by their saved date', order.join('|') === '05 Nov 2026|03 Nov 2026|02 Nov 2026|10 May 2026', order.join('|'));
  await p.evaluate(() => document.querySelectorAll('#notes-container .note-goal')[3].click()); await p.waitForTimeout(500);
  check('opening a goal from another view scrolls it into view', await p.evaluate(() => { const b = document.querySelector('.milestone-card.open').getBoundingClientRect(); return b.top >= 0 && b.top < window.innerHeight - 100; }));
  await p.evaluate(() => window.scrollTo(0, 800)); await p.evaluate(() => switchTab('timeline'));
  check('switching view starts at the top of the page', await p.evaluate(() => window.scrollY === 0));
  await gotoTab(p, 'dashboard');
  check('Overview shows today\'s date instead of a greeting, with no emoji', await p.evaluate(() => { const t = document.getElementById('page-greeting').textContent; return /\d{4}/.test(t) && !/good (morning|afternoon|evening)|👋/i.test(document.getElementById('view-dashboard').textContent); }));
  check('the two least-used sections are folded away but one click opens them', await p.evaluate(() => { const d = [...document.querySelectorAll('#view-dashboard details.fold')]; if (d.length !== 2 || d.some((x) => x.open)) return false; d[0].querySelector('summary').click(); return d[0].open && d[0].querySelector('.guide-step').getBoundingClientRect().height > 0; }));
  await s.browser.close();

  // ---- Reduced motion
  s = await openTracker({ width: 1440, height: 900, reducedMotion: true }); p = s.page;
  const dur = await p.evaluate(() => { switchTab('milestones'); const c = getComputedStyle(document.querySelector('.m-content')); const pg = getComputedStyle(document.querySelector('.page.active')); return [parseFloat(c.transitionDuration), parseFloat(pg.animationDuration)]; });
  check('reduced-motion setting removes transitions and animations', dur.every((d) => d <= 0.001), dur.join(','));
  await s.browser.close();

  // ---- Icon library unavailable (CDN down): page must still work
  const saved = process.env.LUCIDE_LOCAL; delete require.cache[require.resolve('./harness')];
  process.env.LUCIDE_LOCAL = ''; const h2 = require('./harness');
  s = await h2.openTracker({ width: 1440, height: 900 }); p = s.page;
  await p.route(/unpkg\.com/, (r) => r.abort()); await p.reload(); await p.waitForTimeout(700);
  const noIcons = await p.evaluate(() => ({ lucide: !!window.lucide, stats: document.querySelectorAll('#stats-container .stat-num').length, focus: document.querySelectorAll('#focus-section .focus-item').length, nav: document.querySelectorAll('.tab-btn svg').length, panels: document.getElementById('leadership-actions-panel').textContent.length > 20 }));
  check('with the icon library blocked, the overview still renders fully and navigation keeps its icons', !noIcons.lucide && noIcons.stats === 4 && noIcons.focus === 3 && noIcons.nav === 5 && noIcons.panels && s.errors.length === 0, JSON.stringify(noIcons) + s.errors.join('|'));
  await s.browser.close(); process.env.LUCIDE_LOCAL = saved || '';

  // ---- Empty state (fresh browser, nothing saved)
  s = await h2.openTracker({ width: 1440, height: 900, seed: false }); p = s.page;
  const empty = await p.evaluate(() => { switchTab('notes'); const n = document.getElementById('notes-container').textContent; switchTab('dashboard'); return { notes: /No notes have been recorded yet/.test(n), achieved: document.querySelectorAll('#stats-container .stat-num')[1].textContent.trim(), pct: document.getElementById('plan-meter-value').textContent }; });
  check('fresh browser: honest empty states (no notes, 0 achieved, 0%)', empty.notes && empty.achieved === '0' && empty.pct === '0%', JSON.stringify(empty));
  await s.browser.close();

  const failed = out.filter((x) => !x).length;
  console.log(`\n${out.length - failed}/${out.length} passed`);
  process.exit(failed ? 1 : 0);
})();
