// board.mjs: the bounties taking entries right now, read over make.fun's MCP server. No key needed.
// Run: node board.mjs [--category Trading]
import { call, session } from './lib/makefun.mjs';

const at = process.argv.indexOf('--category');
const category = at > 0 ? process.argv[at + 1] : undefined;

await session({ key: '' }, async (client) => {
  const open = [];
  let cursor;
  do {
    const page = await call(client, 'list_competitions', { status: 'open', ...(category ? { category } : {}), ...(cursor ? { cursor } : {}) });
    open.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);

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
});
