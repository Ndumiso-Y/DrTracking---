// Proves the data and persistence code is byte-for-byte the same as the baseline.
// Run: node qa/compare-logic.js   (needs git, compares index.html with tag baseline-pre-glass-redesign)
const fs = require('fs');
const { execSync } = require('child_process');
const now = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const base = execSync('git show baseline-pre-glass-redesign:index.html', { cwd: __dirname, maxBuffer: 1e8 }).toString();

function block(src, startMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) return null;
  let i = src.indexOf('{', a), depth = 0;
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
  return src.slice(a, i + 1);
}
const MUST_MATCH = [
  'const STATUS_MAP =', 'const META_KEYS =', 'const META_ALIASES =', 'function getMetaValue(', 'const INIT_DATA = [', 'const EXECUTIVE_CONTEXT =',
  'function getResponsiblePeopleOptions(', 'async function loadState(', 'function subscribeToChanges(', 'function saveLocalState(', 'async function saveState(',
  'function showToast(', 'function setSyncStatus(', 'function cycleStatus(', 'function updateMilestone(', 'function updateAccountability(', 'function updateAccountabilityBatch(',
  'function getNoteType(', 'function getNoteTypeMeta(', 'function toggleResponsibleOther(', 'function saveAccountabilityForm(', 'function addComment(', 'function editComment(',
  'function deleteComment(', 'function updateTabBadge(', 'function parseLocalDate(', 'function calcDays(', 'function formatDate(', 'function getCountdownBadge(',
  'function getExecutiveContext(', 'function executivePriorityBadgesHTML(', 'function dependencyBadgesHTML(', 'function renderExecutiveDashboardSections(',
  'function getPriorityRank(', 'function priorityBadgeHTML(', 'function formatLastUpdated(', 'function obOpenStatusMenu(', 'function obSetStatus(', 'function sortProjects(',
  'function setNoteFilter(', 'function triggerAddComment(', 'function refreshUI(', 'function exportData(', 'function initApp(',
];
let bad = 0;
for (const m of MUST_MATCH) {
  const a = block(base, m), b = block(now, m);
  const same = a !== null && a === b;
  if (!same) bad++;
  console.log(`${same ? 'IDENTICAL' : 'DIFFERENT'}  ${m.replace(/[(=\[]\s*$/, '').trim()}`);
}
const cfg = (s) => (s.match(/const SUPABASE_URL[^\n]*\n[^\n]*SUPABASE_KEY[^\n]*\n[^\n]*NOTIFICATION_EMAIL[^\n]*/) || [''])[0];
const cfgSame = cfg(base) !== '' && cfg(base) === cfg(now);
console.log(`${cfgSame ? 'IDENTICAL' : 'DIFFERENT'}  cloud configuration lines`);
if (!cfgSame) bad++;
console.log(`\n${MUST_MATCH.length + 1 - bad}/${MUST_MATCH.length + 1} unchanged`);
process.exit(bad ? 1 : 0);
