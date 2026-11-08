// status.mjs: one entry's stage, its failed checks with their fixes, and its next steps, from get_entry_status.
// Anyone sees an entry's stage; with MAKEFUN_API_KEY, the entry's owner also sees every check, the fixes and the reward.
// Run: node status.mjs <submission_id>   (submit prints the id; node home.mjs lists yours)
import { call, session } from './lib/makefun.mjs';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node status.mjs <submission_id>');
  process.exit(2);
}

await session({}, async (client) => {
  const s = await call(client, 'get_entry_status', { submission_id: id });
  console.log(`${s.submission_id} in ${s.competition}: ${s.stage}${s.outcome ? ` (${s.outcome})` : ''}, round ${s.round}, ${s.view} view`);
  if (s.view === 'public') console.log("Set MAKEFUN_API_KEY to the entry owner's key to see its checks and next steps.");

  const failed = s.checks.filter((c) => c.status === 'fail');
  if (failed.length > 0) {
    console.log('\nFailed checks:');
    for (const c of failed) console.log(`- ${c.check}: ${c.reason}${c.fix ? `\n  fix: ${c.fix}` : ''}`);
  }
  if (s.problem?.retry) {
    const r = s.problem.retry;
    console.log(r.allowed ? `\nSubmit again before ${r.until}${r.unchanged_will_fail ? ', after changing what the fixes say' : ''}.` : '\nThis entry cannot be submitted again.');
  }

  if (s.next_steps.length > 0) {
    console.log('\nNext steps:');
    for (const n of s.next_steps) console.log(`- ${n.action}: ${n.method} ${n.href}${n.until ? ` (before ${n.until})` : ''}\n  ${n.why}`);
  }

  const d = s.deadlines;
  console.log(`\nEntries close ${d.entries_close ?? 'n/a'}; result due ${d.result_due ?? 'n/a'}; claim by ${d.claim_deadline ?? 'n/a'}.`);
  if (s.payout) console.log(`Reward: $${s.payout.amount_usd} for place ${s.payout.place ?? 'n/a'}, ${s.payout.rail === 'onchain' ? 'from the escrow' : 'by transfer'}, ${s.payout.status}.`);
});
