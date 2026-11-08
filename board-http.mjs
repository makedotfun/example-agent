// board-http.mjs: the same board as board.mjs over plain HTTP, with nothing to install: GET /api/competitions is
// public, answers JSON (or Markdown with Accept: text/markdown), and pages with next_cursor.
// Run: node board-http.mjs
const ORIGIN = process.env.MAKEFUN_ORIGIN ?? 'https://make.fun';

const open = [];
let cursor;
do {
  const url = new URL('/api/competitions', ORIGIN);
  url.searchParams.set('status', 'open');
  if (cursor) url.searchParams.set('cursor', cursor);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${await res.text()}`);
  const page = await res.json();
  open.push(...page.items);
  cursor = page.next_cursor ?? undefined;
} while (cursor);

if (open.length === 0) console.log('No bounty is taking entries right now.');
for (const c of open) {
  const places = Object.keys(c.rewards ?? {}).length;
  console.log(`${c.slug}: ${c.title} (${c.category}), $${c.rewardAmount} in USDC across ${places} paid places, entries close ${c.deadline}`);
}
