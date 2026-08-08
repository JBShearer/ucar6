// Backfill actor/target for existing filings
// Run with: node scripts/backfill_actors.mjs


if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_TOKEN = process.env.HYPERSPACE_TOKEN;
const MODEL = 'claude-sonnet-4-20250514'; // Fast model for extraction

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const PROMPT = `Extract WHO and WHOM from this AI use case.

WHO = the company/organization deploying or creating the AI (e.g., Microsoft, Google, OpenAI, Police Department, Hospital, Government)
WHOM = who is affected/targeted by the AI (e.g., workers, students, patients, job applicants, users, citizens, drivers)

Be specific but normalize to common terms:
- "Microsoft Corp" → "Microsoft"
- "NYC Police" → "Police"
- "job seekers" → "Job Applicants"
- "people applying for jobs" → "Job Applicants"

CASE TITLE: {title}
HEADLINE: {headline}
SUMMARY: {summary}

Return JSON only:
{"actor": "Company/Org Name or null", "target": "Affected Group or null"}
`;

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

async function callLLM(prompt) {
  const res = await fetch(HYPERSPACE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HYPERSPACE_TOKEN}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    throw new Error(`Hyperspace ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || '';
  const clean = content.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function getOrCreateTerm(kind, term) {
  if (!term) return null;
  const norm = term.toLowerCase().trim();
  if (!norm || norm === 'null') return null;

  // Try exact match first
  const existing = await sb(`vocab_terms?kind=eq.${kind}&term=eq.${encodeURIComponent(norm)}&limit=1`);
  if (existing.length > 0) {
    return { id: existing[0].id, term: existing[0].term };
  }

  // Create new term
  const created = await sb('vocab_terms', {
    method: 'POST',
    body: JSON.stringify({ kind, term: norm, status: 'active' })
  });
  return { id: created[0].id, term: created[0].term };
}

async function processOne(filing, caseData) {
  try {
    const prompt = PROMPT
      .replace('{title}', caseData.title_render || '')
      .replace('{headline}', filing.headline || '')
      .replace('{summary}', filing.summary || '');

    const result = await callLLM(prompt);

    const actor = result.actor ? await getOrCreateTerm('actor', result.actor) : null;
    const target = result.target ? await getOrCreateTerm('target', result.target) : null;

    // Note: cases.actor_id/target_id columns don't exist yet
    // But vocab_terms now has the actor/target entries with use_count
    // The filters will work by matching case title_render patterns

    return { actor: actor?.term, target: target?.term };
  } catch (err) {
    console.error(`Error processing filing ${filing.id}: ${err.message}`);
    return { error: err.message };
  }
}

async function main() {
  console.log('=== Backfill Actor/Target ===\n');

  // First, check if cases table has actor_id/target_id columns
  // If not, we need to add them via Supabase dashboard

  // Get all cases that don't have actor_id set
  let offset = 0;
  let total = 0;
  let updated = 0;
  let errors = 0;

  while (true) {
    // Get cases with their first filing
    const cases = await sb(
      `cases?select=id,title_render,filings(id,headline,summary)&status=eq.live&order=created_at.desc&offset=${offset}&limit=50`
    );

    if (cases.length === 0) break;

    console.log(`\nProcessing batch at offset ${offset} (${cases.length} cases)...`);

    for (const c of cases) {
      const filing = c.filings?.[0];
      if (!filing) {
        console.log(`  ${c.title_render?.slice(0, 40)}... no filings`);
        continue;
      }

      process.stdout.write(`  ${c.title_render?.slice(0, 40)}... `);

      const result = await processOne(filing, c);

      if (result.error) {
        console.log(`✗ ${result.error.slice(0, 30)}`);
        errors++;
      } else if (result.actor || result.target) {
        console.log(`✓ ${result.actor || '?'} → ${result.target || '?'}`);
        updated++;
      } else {
        console.log('- no actor/target');
      }

      total++;

      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    }

    offset += cases.length;

    console.log(`\n--- Progress: ${total} processed, ${updated} updated, ${errors} errors ---`);

    // Safety limit
    if (total >= 500) {
      console.log('\nReached batch limit (500). Run again to continue.');
      break;
    }
  }

  // Show stats
  const actorCount = await sb('vocab_terms?kind=eq.actor&select=id');
  const targetCount = await sb('vocab_terms?kind=eq.target&select=id');

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Updated: ${updated} | Errors: ${errors}`);
  console.log(`Actors in vocab: ${actorCount.length} | Targets in vocab: ${targetCount.length}`);
}

main().catch(console.error);
