// Usage: node qa/capture.js <before|after> [file]
// Captures every view at 1440, 1024, 768 and 390 wide into qa/screenshots/<label>/.
const path = require('path');
const fs = require('fs');
const { openTracker, gotoTab, ROOT } = require('./harness');

const label = process.argv[2] || 'after';
const file = process.argv[3] || 'index.html';
const outDir = path.join(ROOT, 'qa', 'screenshots', label);
fs.mkdirSync(outDir, { recursive: true });

// 1672x941 is the size of the approved design image, for side-by-side comparison.
const WIDTHS = [[1672, 941], [1440, 900], [1024, 768], [768, 1024], [390, 844]];
const TABS = [['dashboard', 'overview'], ['projects', 'ownership-board'], ['milestones', 'goals'], ['timeline', 'timeline'], ['notes', 'all-notes']];

(async () => {
  for (const [w, h] of WIDTHS) {
    const { browser, page, errors } = await openTracker({ width: w, height: h, file });
    for (const [tab, name] of TABS) {
      await gotoTab(page, tab);
      if (tab === 'milestones') { await page.evaluate(() => toggleCard(1)); await page.waitForTimeout(450); }
      await page.screenshot({ path: path.join(outDir, `${w}-${name}.jpg`), type: 'jpeg', quality: 82 });
      await page.screenshot({ path: path.join(outDir, `${w}-${name}-full.jpg`), type: 'jpeg', quality: 62, fullPage: true });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`${w}px: page errors=${errors.length} horizontal overflow=${overflow}px`);
    if (errors.length) console.log('  ', errors.slice(0, 3).join('\n   '));
    await browser.close();
  }
})();
