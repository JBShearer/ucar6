import { createClient } from '@supabase/supabase-js';
import ws from 'ws';


if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
const sb = createClient(
  'https://znhsnishdqrmumxbgobq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

// Get all votes
const { data: votes, error: vErr } = await sb.from('votes').select('*');
if (vErr) { console.log('Votes error:', vErr); process.exit(1); }

console.log('=== ALL VOTES IN DB ===');
console.log('Total votes:', votes.length);

const goodVotes = votes.filter(v => v.vote_type === 'good');
const evilVotes = votes.filter(v => v.vote_type === 'evil');

console.log('Good votes:', goodVotes.length);
console.log('Evil votes:', evilVotes.length);

// Group by filing_id
const byFiling = {};
votes.forEach(v => {
  if (!byFiling[v.filing_id]) byFiling[v.filing_id] = { good: 0, evil: 0 };
  if (v.vote_type === 'good') byFiling[v.filing_id].good++;
  else if (v.vote_type === 'evil') byFiling[v.filing_id].evil++;
});

console.log('\nVotes span', Object.keys(byFiling).length, 'filings');

// Now check cases with good_votes > 0 or evil_votes > 0
const { data: goodCases } = await sb.from('cases').select('id, verb, good_votes, evil_votes').gt('good_votes', 0);
const { data: evilCases } = await sb.from('cases').select('id, verb, good_votes, evil_votes').gt('evil_votes', 0);

console.log('\n=== CASES WITH VOTES ===');
console.log('Cases with good_votes > 0:', goodCases?.length);
console.log('Cases with evil_votes > 0:', evilCases?.length);

// Show the good cases
console.log('\nGood cases:');
goodCases?.forEach(c => console.log(`  Case #${c.id}: ${c.verb} (good=${c.good_votes})`));

console.log('\nEvil cases:');
evilCases?.forEach(c => console.log(`  Case #${c.id}: ${c.verb} (evil=${c.evil_votes})`));

process.exit(0);
