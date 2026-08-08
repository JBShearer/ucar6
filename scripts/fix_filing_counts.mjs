// Fix filing_count for all cases by counting actual filings


if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Fetching all live cases...');

  // Get ALL cases (paginate)
  let allCases = [];
  let offset = 0;
  while (true) {
    const batch = await sb(`cases?status=eq.live&select=id,case_number,title_render,filing_count&order=case_number&offset=${offset}&limit=1000`);
    if (batch.length === 0) break;
    allCases.push(...batch);
    offset += batch.length;
    if (batch.length < 1000) break;
  }

  console.log(`Total cases: ${allCases.length}`);

  let fixed = 0;
  for (const c of allCases) {
    // Count actual filings
    const filings = await sb(`filings?case_id=eq.${c.id}&status=eq.live&select=id,created_at`);
    const actualCount = filings.length;

    if (actualCount !== c.filing_count) {
      // Get latest filing date
      const lastFiled = filings.length > 0
        ? filings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null;

      await sb(`cases?id=eq.${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          filing_count: actualCount,
          last_filed_at: lastFiled
        })
      });

      process.stdout.write('.');
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} cases`);
}

main().catch(console.error);
