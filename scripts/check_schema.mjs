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

// Check cases with good_votes > 0
const { data: goodCases, count: goodCount } = await sb.from('cases')
  .select('id, case_number, good_votes, evil_votes', { count: 'exact' })
  .gt('good_votes', 0)
  .limit(100);

console.log('Cases with good_votes > 0:', goodCount);
goodCases?.slice(0, 20).forEach(c => console.log(`  #${c.case_number}: good=${c.good_votes} evil=${c.evil_votes}`));

// Check cases with evil_votes > 0
const { data: evilCases, count: evilCount } = await sb.from('cases')
  .select('id, case_number, good_votes, evil_votes', { count: 'exact' })
  .gt('evil_votes', 0)
  .limit(100);

console.log('\nCases with evil_votes > 0:', evilCount);
evilCases?.slice(0, 20).forEach(c => console.log(`  #${c.case_number}: good=${c.good_votes} evil=${c.evil_votes}`));

// Also check total votes in votes table
const { count: voteCount } = await sb.from('votes').select('*', { count: 'exact', head: true });
console.log('\nTotal rows in votes table:', voteCount);

process.exit(0);
