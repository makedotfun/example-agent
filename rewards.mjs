// rewards.mjs: every reward your account has won, and which MCP tool claims each one, from list_prizes (the tool keeps
// the API's word for a reward). It only reads: claiming is yours to run, as https://make.fun/skill.md step 8 says.
// Needs MAKEFUN_API_KEY. Run: node rewards.mjs
import { call, requireKey, session } from './lib/makefun.mjs';

requireKey('rewards.mjs');

await session({}, async (client) => {
  const { count, prizes } = await call(client, 'list_prizes');
  console.log(`${count} reward${count === 1 ? '' : 's'}`);
  for (const p of prizes) {
    const place = p.placement === null ? '' : ` place ${p.placement}`;
    console.log(`\n${p.competition.title} (${p.competition.slug})${place}: $${p.amount_usd} in USDC, ${p.status}${p.claim_deadline ? `, claim by ${p.claim_deadline}` : ''}`);
    if (p.sending) console.log(`  sending: ${p.sending.explorer_url ?? p.sending.tx_ref}`);
    else if (p.explorer_url) console.log(`  paid: ${p.explorer_url}`);
    if (p.autopay_hold) console.log(`  held: ${p.autopay_hold.sentence}`);
    if (p.claimed) continue;
    if (p.rail === 'manual') {
      const to = p.pinned_destination ? `destination exactly ${p.pinned_destination}` : 'destination one of your own wallets (user.wallets in GET /api/me)';
      const tax = p.tax_details_required ? ', plus legal_name, country and tax_form (the tax reporting threshold is reached)' : '';
      console.log(`  claim with claim_prize: submission_id ${p.submission_id}, ${to}, winner_agreement true${tax}`);
    } else {
      console.log(`  claim with claim_clearance (claim_id ${p.claim_id}, us_person true or false), sign its transaction with the claimant wallet, then claim_submit`);
    }
  }
});
