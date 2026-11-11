// Theme checks: switching, persistence, isolation from tracker data, layout, and a text-contrast audit.
// Run: node qa/themes.js   (synthetic data, local mode only; see harness.js)
const { openTracker, gotoTab } = require('./harness');
const out = [];
const check = (name, ok, detail = '') => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };
const THEMES = [['aurora', 'Light', 4.5], ['midnight', 'Dark', 4.5], ['contrast', 'High contrast', 7]];
const TABS = ['dashboard', 'projects', 'milestones', 'timeline', 'notes'];

// Walks every visible text element and compares its colour with the colour actually behind it.
const AUDIT = (minRatio) => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (e !== document.body && e !== document.documentElement && /gradient/.test(cs.backgroundImage)) {
        // Gradient fill: return every opaque colour stop so the text is checked against the worst one.
        const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter((c) => c[3] >= 0.99);
        return stops.length ? { stops } : null;
      }
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 0.999) break;
    }
    let base = parse(getComputedStyle(document.body).backgroundColor); if (base[3] < 0.999) base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const fails = {}; let checked = 0, skipped = 0;
  const view = document.querySelector('.page.active');
  const roots = [document.querySelector('.sidebar'), document.querySelector('.app-header'), view];
  roots.forEach((root) => root.querySelectorAll('*').forEach((el) => {
    if (!el.getClientRects().length || el.closest('.sr-only, svg, .is-faded')) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.99) return;
    const col = parse(cs.color);
    if (col[3] === 0) { skipped++; return; } // gradient-filled heading
    const bg = bgOf(el);
    if (!bg) { skipped++; return; }
    const r = bg.stops ? Math.min(...bg.stops.map((st) => ratio(over(col, st), st))) : ratio(over(col, bg), bg);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? Math.min(minRatio, minRatio === 7 ? 4.5 : 3) : minRatio;
    checked++;
    if (r + 0.005 < need) { const k = (el.className && String(el.className).split(' ')[0]) || el.tagName; if (!fails[k] || r < fails[k].r) fails[k] = { r: Math.round(r * 100) / 100, need, text: el.textContent.trim().slice(0, 28) }; }
  }));
  return { checked, skipped, fails };
};

(async () => {
  // ---- Switching, persistence, isolation
  let s = await openTracker({ width: 1440, height: 900 }); let p = s.page;
  const before = await p.evaluate(() => localStorage.getItem('dr_tebeila_app_v2'));
  check('default appearance is Light (Aurora)', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'aurora' && document.querySelector('.theme-btn[aria-pressed="true"]').textContent.trim() === 'Light'));
  for (const [key, label] of THEMES) {
    await p.locator('.theme-btn', { hasText: label }).first().click();
    const st = await p.evaluate(() => ({ t: document.documentElement.getAttribute('data-theme'), pressed: [...document.querySelectorAll('.theme-btn[aria-pressed="true"]')].map((b) => b.getAttribute('data-theme-option')), saved: localStorage.getItem('dr_tebeila_theme') }));
    check(`"${label}" button applies and marks its theme`, st.t === key && st.pressed.length === 1 && st.pressed[0] === key && st.saved === key, JSON.stringify(st));
  }
  await p.reload(); await p.waitForTimeout(600);
  check('chosen appearance survives a reload', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'contrast'));
  check('appearance is stored separately and tracker data is untouched', (await p.evaluate(() => localStorage.getItem('dr_tebeila_app_v2'))) === before && !/theme/i.test(before));
  await p.evaluate(() => updateMilestone(4, { status: 'G' }));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('dr_tebeila_app_v2')));
  check('saving a status in another theme writes the same record shape', saved['4'].status === 'G' && Object.keys(saved['4']).sort().join(',') === 'comments,lastUpdated,metadata,status', Object.keys(saved['4']).join(','));
  await p.focus('.theme-btn[data-theme-option="aurora"]'); await p.keyboard.press('Enter');
  check('appearance switch works from the keyboard', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'aurora'));
  check('no script errors while switching', s.errors.length === 0, s.errors.join('|'));
  await s.browser.close();

  // ---- Layout and contrast in every theme
  for (const [key, label, min] of THEMES) {
    for (const w of [1440, 390]) {
      s = await openTracker({ width: w, height: 900 }); p = s.page;
      await p.evaluate((k) => setTheme(k), key);
      let worst = 0; const fails = {}; let checked = 0;
      for (const t of TABS) {
        await gotoTab(p, t);
        if (t === 'milestones') { await p.evaluate(() => { toggleCard(1); toggleCard(6); }); await p.waitForTimeout(400); }
        if (t === 'projects' && w === 1440) await p.locator('.projects-table tbody tr .ob-status-pill').first().click();
        worst = Math.max(worst, await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
        const a = await p.evaluate(AUDIT, min);
        checked += a.checked; for (const k in a.fails) fails[t + ' .' + k] = a.fails[k];
      }
      check(`${label} at ${w}px: no sideways page scroll`, worst <= 1, worst + 'px');
      const list = Object.entries(fails).map(([k, v]) => `${k} ${v.r}:1 (needs ${v.need}) "${v.text}"`);
      check(`${label} at ${w}px: text contrast at least ${min}:1 on ${checked} text elements`, list.length === 0, '\n      ' + list.slice(0, 14).join('\n      '));
      await s.browser.close();
    }
  }
  const failed = out.filter((x) => !x).length;
  console.log(`\n${out.length - failed}/${out.length} passed`);
  process.exit(failed ? 1 : 0);
})();
