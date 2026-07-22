// Backfill actor_id and target_id on cases table
// Links cases to vocab_terms based on existing filings data
// Run with: node scripts/backfill_case_actors.mjs

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

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

async function getOrCreateTerm(kind, term) {
  if (!term) return null;
  const norm = term.toLowerCase().trim();
  if (!norm || norm === 'null') return null;

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
  console.log('=== Backfill Case Actor/Target IDs ===\n');

  // Get all cases that need actor_id or target_id
  let offset = 0;
  let total = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    // Get cases with their filings (to extract actor/target)
    const cases = await sb(
      `cases?select=id,title_render,actor_id,target_id,filings(actor,target)&status=eq.live&order=created_at.desc&offset=${offset}&limit=50`
    );

    if (cases.length === 0) break;

    console.log(`\nProcessing batch at offset ${offset} (${cases.length} cases)...`);

    for (const c of cases) {
      // Skip if already has both
      if (c.actor_id && c.target_id) {
        skipped++;
        continue;
      }

      // Get actor/target from first filing that has them
      let actor = null;
      let target = null;
      for (const f of (c.filings || [])) {
        if (!actor && f.actor) actor = f.actor;
        if (!target && f.target) target = f.target;
        if (actor && target) break;
      }

      // If no actor/target from filings, skip
      if (!actor && !target) {
        skipped++;
        continue;
      }

      process.stdout.write(`  ${c.title_render?.slice(0, 40)}... `);

      try {
        const updates = {};

        if (actor && !c.actor_id) {
          const actorId = await getOrCreateTerm('actor', actor);
          if (actorId) updates.actor_id = actorId;
        }

        if (target && !c.target_id) {
          const targetId = await getOrCreateTerm('target', target);
          if (targetId) updates.target_id = targetId;
        }

        if (Object.keys(updates).length > 0) {
          await sb(`cases?id=eq.${c.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
          });
          console.log(`✓ ${actor || '?'} → ${target || '?'}`);
          updated++;
        } else {
          console.log('- no updates');
          skipped++;
        }
      } catch (err) {
        console.log(`✗ ${err.message.slice(0, 40)}`);
      }

      total++;

      // Small delay
      await new Promise(r => setTimeout(r, 50));
    }

    offset += cases.length;

    console.log(`\n--- Progress: ${total} processed, ${updated} updated, ${skipped} skipped ---`);

    // Safety limit
    if (total >= 2000) {
      console.log('\nReached batch limit (2000). Run again to continue.');
      break;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Updated: ${updated} | Skipped: ${skipped}`);
}

main().catch(console.error);
