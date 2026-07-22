// Backfill actor_id and target_id on cases using LLM extraction
// Run with: node scripts/backfill_case_actors_llm.mjs

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'claude-sonnet-4-20250514';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const PROMPT = `Extract WHO and WHOM from this AI use case title.

WHO = the company/organization deploying or creating the AI (e.g., Microsoft, Google, OpenAI, Meta, Amazon, Apple, Police, Hospital, Government, Researchers)
WHOM = who is affected/targeted by the AI (e.g., Workers, Students, Patients, Job Applicants, Users, Citizens, Drivers, Children, Employees)

Be specific but normalize to common terms. If the title doesn't clearly indicate a WHO or WHOM, return null for that field.

CASE TITLE: {title}

Return JSON only:
{"actor": "Company/Org Name or null", "target": "Affected Group or null"}`;

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
  if (!term || term === 'null') return null;
  const norm = term.toLowerCase().trim();
  if (!norm) return null;

  // Try exact match first
  const existing = await sb(`vocab_terms?kind=eq.${kind}&term=eq.${encodeURIComponent(norm)}&limit=1`);
  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new term
  const created = await sb('vocab_terms', {
    method: 'POST',
    body: JSON.stringify({ kind, term: norm, status: 'active' })
  });
  return created[0].id;
}

async function main() {
  console.log('=== Backfill Case Actor/Target via LLM ===\n');

  let offset = 0;
  let total = 0;
  let updated = 0;
  let errors = 0;

  while (true) {
    // Get cases without actor_id or target_id
    const cases = await sb(
      `cases?select=id,title_render,actor_id,target_id&status=eq.live&or=(actor_id.is.null,target_id.is.null)&order=created_at.desc&offset=${offset}&limit=50`
    );

    if (cases.length === 0) break;

    console.log(`\nProcessing batch at offset ${offset} (${cases.length} cases)...`);

    for (const c of cases) {
      process.stdout.write(`  ${c.title_render?.slice(0, 50)}... `);

      try {
        const prompt = PROMPT.replace('{title}', c.title_render || '');
        const result = await callLLM(prompt);

        const updates = {};

        if (!c.actor_id && result.actor && result.actor !== 'null') {
          const actorId = await getOrCreateTerm('actor', result.actor);
          if (actorId) updates.actor_id = actorId;
        }

        if (!c.target_id && result.target && result.target !== 'null') {
          const targetId = await getOrCreateTerm('target', result.target);
          if (targetId) updates.target_id = targetId;
        }

        if (Object.keys(updates).length > 0) {
          await sb(`cases?id=eq.${c.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
          });
          console.log(`✓ ${result.actor || '-'} → ${result.target || '-'}`);
          updated++;
        } else {
          console.log('- no actor/target found');
        }
      } catch (err) {
        console.log(`✗ ${err.message.slice(0, 40)}`);
        errors++;
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

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Updated: ${updated} | Errors: ${errors}`);
}

main().catch(console.error);
