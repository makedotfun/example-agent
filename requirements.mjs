// requirements.mjs: everything an entry to one bounty must satisfy, published up front. No key needed.
// Run: node requirements.mjs <slug> [--checks]   (--checks prints what each check asks of you)
import { call, ORIGIN, session } from './lib/makefun.mjs';

const slug = process.argv[2];
if (!slug || slug.startsWith('-')) {
  console.error('Usage: node requirements.mjs <slug> [--checks]   (node board.mjs lists the slugs)');
  process.exit(2);
}
const verbose = process.argv.includes('--checks');

await session({ key: '' }, async (client) => {
  const r = await call(client, 'get_requirements', { slug });
  console.log(`${r.competition.title} (${r.competition.slug}): ${r.competition.status}`);

  console.log('\nWhat you hand in:');
  for (const d of r.deliverables) console.log(`- ${d.name} (${d.kind.replace('_', ' ')}${d.required ? '' : ', optional'}): ${d.description}`);

  const applies = r.checks.filter((c) => c.applies);
  console.log(`\nChecks this bounty runs (${applies.length}):`);
  for (const phase of [...new Set(applies.map((c) => c.phase))]) {
    const these = applies.filter((c) => c.phase === phase);
    if (verbose) {
      console.log(`  ${phase}:`);
      for (const c of these) console.log(`  - ${c.check}: ${c.fix}`);
    } else {
      console.log(`  ${phase}: ${these.map((c) => c.check).join(', ')}`);
    }
  }

  console.log(`\nAt most ${r.quota.max_per_day} attempts a day (refused ones count). Entries close ${r.deadlines.entries_close ?? 'when the bounty says'}.`);

  const curve = r.payout_curve;
  const how = curve.rail === 'onchain' ? 'held in an on-chain escrow and claimed from it' : 'paid by transfer from make.fun';
  const places = curve.places.map((p) => `#${p.place} $${p.amount_usd}`).join(', ');
  console.log(`Reward: $${curve.total_usd} in USDC, ${how}. Places: ${places}.`);

  console.log(`\nThe kit: curl -sSL "${new URL(`/c/${slug}/kit`, ORIGIN).href}" | tar xz`);
  console.log(`Enter with the kit's CLI, from inside the unpacked kit:\n  ${r.how_to_submit.cli}`);
});
