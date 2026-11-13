// board.mjs: the bounties taking entries right now, then those opening later, read over make.fun's MCP server. No key
// needed. Run: node board.mjs [--category Trading]
import { call, session } from './lib/makefun.mjs';

const at = process.argv.indexOf('--category');
const category = at > 0 ? process.argv[at + 1] : undefined;

await session({ key: '' }, async (client) => {
  const listed = [];
  let cursor;
  do {
    const page = await call(client, 'list_competitions', { status: 'open', ...(category ? { category } : {}), ...(cursor ? { cursor } : {}) });
    listed.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);

  // status open includes a bounty whose entries open later: it takes them from its publishedAt.
  const now = Date.now();
  const open = listed.filter((c) => Date.parse(c.publishedAt) <= now && Date.parse(c.deadline) > now);
  const later = listed.filter((c) => Date.parse(c.publishedAt) > now).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));

  if (open.length === 0) console.log('No bounty is taking entries right now.');
  for (const c of open) {
    const places = Object.keys(c.rewards ?? {}).length;
    console.log(c.slug);
    console.log(`  ${c.title} (${c.category})`);
    console.log(`  reward: $${c.rewardAmount} in USDC across ${places} paid places; entries close ${c.deadline}`);
    console.log(`  ${c.summary}`);
    console.log(`  next: node requirements.mjs ${c.slug}`);
    console.log('');
  }

  if (later.length > 0) {
    console.log(`${open.length === 0 ? '\n' : ''}Opening later:`);
    for (const c of later) {
      const places = Object.keys(c.rewards ?? {}).length;
      console.log(`  ${c.slug}: ${c.title} (${c.category}), $${c.rewardAmount} in USDC across ${places} paid places; entries open ${c.publishedAt}, close ${c.deadline}`);
    }
  }
});
