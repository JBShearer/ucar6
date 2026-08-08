// Generate embeddings for cases via Hyperspace

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
const HYPERSPACE_URL = 'http://localhost:6655/openai/v1/embeddings';
const HYPERSPACE_TOKEN = process.env.HYPERSPACE_TOKEN;
const MODEL = 'text-embedding-3-small';

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

async function getEmbedding(text) {
  const res = await fetch(HYPERSPACE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HYPERSPACE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      input: text.slice(0, 8000),
      dimensions: 384  // Reduce to match database column
    })
  });

  if (!res.ok) {
    throw new Error(`Hyperspace ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function main() {
  console.log('=== Generate Case Embeddings via Hyperspace ===');
  console.log(`Model: ${MODEL}\n`);

  // Get cases without embeddings
  const cases = await sb('cases?select=id,title_render,domain&embedding=is.null&status=eq.live&limit=100');
  console.log(`Found ${cases.length} cases without embeddings\n`);

  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const c of cases) {
    try {
      // Create text to embed: title + domain
      const text = `${c.title_render} ${c.domain || ''}`.trim();

      const embedding = await getEmbedding(text);

      // Update case with embedding
      await sb(`cases?id=eq.${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ embedding: embedding })
      });

      success++;
      process.stdout.write('✓');
    } catch (err) {
      errors++;
      process.stdout.write('✗');
      console.error(`\nError for ${c.title_render}: ${err.message}`);
    }

    processed++;

    // Progress every 20
    if (processed % 20 === 0) {
      console.log(` [${processed}/${cases.length}]`);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n\n=== Done ===`);
  console.log(`Processed: ${processed} | Success: ${success} | Errors: ${errors}`);
}

main().catch(console.error);
