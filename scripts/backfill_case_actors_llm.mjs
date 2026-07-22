// Backfill actor_id and target_id on cases using LLM extraction FROM FILINGS
// Run with: node scripts/backfill_case_actors_llm.mjs

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'claude-sonnet-4-20250514';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const PROMPT = `Extract WHO (company/org deploying AI) and WHOM (people affected) from these news articles about an AI use case.

PRIORITIZE SPECIFIC COMPANIES over generic terms:
- If Microsoft, Google, Meta, Amazon, Apple, OpenAI, SAP, IBM, Oracle, Adobe, Tesla, Uber, etc. are mentioned → use that name
- Only use generic terms (Researchers, Developers, Employers) if NO specific company is named

HEADLINES & SUMMARIES:
{articles}

Return JSON only:
{"actor": "Specific Company or Generic Term", "target": "Affected Group"}`;

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
      max_tokens: 100,
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
  if (!term || term === 'Unknown' || term === 'null' || term === null) return null;
  const norm = term.toLowerCase().trim();
  if (!norm) return null;

  const existing = await sb(`vocab_terms?kind=eq.${kind}&term=eq.${encodeURIComponent(norm)}&limit=1`);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const created = await sb('vocab_terms', {
    method: 'POST',
    body: JSON.stringify({ kind, term: norm, status: 'active' })
  });
  return created[0].id;
}

async function main() {
  console.log('=== Backfill Case Actor/Target FROM FILINGS ===\n');

  let total = 0;
  let updated = 0;
  let errors = 0;
  const processed = new Set();

  while (true) {
    // Get cases missing actor_id or target_id, with their filings
    const cases = await sb(
      `cases?select=id,title_render,actor_id,target_id,filings(headline,summary)&status=eq.live&or=(actor_id.is.null,target_id.is.null)&limit=50`
    );

    const fresh = cases.filter(c => !processed.has(c.id));
    if (fresh.length === 0) break;

    console.log(`\nProcessing batch (${fresh.length} cases)...`);

    for (const c of fresh) {
      processed.add(c.id);

      // Skip if no filings
      if (!c.filings || c.filings.length === 0) {
        continue;
      }

      // Build article text from filings (up to 5)
      const articles = c.filings.slice(0, 5).map(f =>
        `HEADLINE: ${f.headline}\nSUMMARY: ${f.summary}`
      ).join('\n\n');

      process.stdout.write(`  ${c.title_render?.slice(0, 45)}... `);

      try {
        const prompt = PROMPT.replace('{articles}', articles);
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
          console.log(`- no updates`);
        }
      } catch (err) {
        console.log(`✗ ${err.message.slice(0, 40)}`);
        errors++;
      }

      total++;
      await new Promise(r => setTimeout(r, 80));
    }

    console.log(`\n[${total} processed, ${updated} updated, ${errors} errors]\n`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Updated: ${updated} | Errors: ${errors}`);
}

main().catch(console.error);
