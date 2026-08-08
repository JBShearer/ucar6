// One-time case consolidation script
// Merges similar cases based on embedding similarity


if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Similarity threshold for merging
const SIMILARITY_THRESHOLD = 0.88;

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

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  console.log('=== Case Consolidation Script ===');
  console.log(`Similarity threshold: ${SIMILARITY_THRESHOLD}\n`);

  // Fetch all live cases with embeddings
  console.log('Fetching all cases...');
  let allCases = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const batch = await sb(`cases?status=eq.live&select=id,title_render,embedding,filing_count,good_votes,evil_votes,created_at&order=filing_count.desc&offset=${offset}&limit=${limit}`);
    if (batch.length === 0) break;
    allCases = allCases.concat(batch);
    offset += batch.length;
    console.log(`  Loaded ${allCases.length} cases...`);
  }

  console.log(`Total: ${allCases.length} cases\n`);

  // Filter to cases with embeddings and parse them (stored as JSON strings)
  const casesWithEmbeddings = allCases.filter(c => c.embedding).map(c => ({
    ...c,
    embedding: typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding
  })).filter(c => Array.isArray(c.embedding) && c.embedding.length > 0);
  console.log(`Cases with embeddings: ${casesWithEmbeddings.length}\n`);

  // Build clusters using Union-Find
  const parent = new Map();
  const rank = new Map();

  function find(x) {
    if (!parent.has(x)) {
      parent.set(x, x);
      rank.set(x, 0);
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)));
    }
    return parent.get(x);
  }

  function union(x, y) {
    const px = find(x), py = find(y);
    if (px === py) return;
    if (rank.get(px) < rank.get(py)) {
      parent.set(px, py);
    } else if (rank.get(px) > rank.get(py)) {
      parent.set(py, px);
    } else {
      parent.set(py, px);
      rank.set(px, rank.get(px) + 1);
    }
  }

  // Compare all pairs and merge similar ones
  console.log('Finding similar cases...');
  let comparisons = 0;
  let merges = 0;

  for (let i = 0; i < casesWithEmbeddings.length; i++) {
    for (let j = i + 1; j < casesWithEmbeddings.length; j++) {
      const sim = cosineSimilarity(casesWithEmbeddings[i].embedding, casesWithEmbeddings[j].embedding);
      comparisons++;

      if (sim >= SIMILARITY_THRESHOLD) {
        union(casesWithEmbeddings[i].id, casesWithEmbeddings[j].id);
        merges++;
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`  Processed ${i}/${casesWithEmbeddings.length} cases, found ${merges} merge pairs...`);
    }
  }

  console.log(`\nComparisons: ${comparisons}, Merge pairs: ${merges}\n`);

  // Build clusters
  const clusters = new Map();
  for (const c of casesWithEmbeddings) {
    const root = find(c.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(c);
  }

  // Filter to clusters with multiple cases
  const mergeClusters = [...clusters.values()].filter(cl => cl.length > 1);
  console.log(`Clusters to merge: ${mergeClusters.length}`);

  // Calculate total cases that will be merged away
  const casesToDelete = mergeClusters.reduce((sum, cl) => sum + cl.length - 1, 0);
  console.log(`Cases to be merged away: ${casesToDelete}`);
  console.log(`Final case count: ${allCases.length - casesToDelete}\n`);

  // Process each cluster
  let processed = 0;
  let filingsReassigned = 0;
  let casesDeleted = 0;

  for (const cluster of mergeClusters) {
    // Pick the canonical case: highest filing_count, then most votes, then oldest
    cluster.sort((a, b) => {
      if (b.filing_count !== a.filing_count) return b.filing_count - a.filing_count;
      const aVotes = (a.good_votes || 0) + (a.evil_votes || 0);
      const bVotes = (b.good_votes || 0) + (b.evil_votes || 0);
      if (bVotes !== aVotes) return bVotes - aVotes;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const canonical = cluster[0];
    const toMerge = cluster.slice(1);

    console.log(`\nCluster: ${canonical.title_render}`);
    console.log(`  Canonical: ${canonical.id} (${canonical.filing_count} filings)`);

    for (const c of toMerge) {
      console.log(`  Merging: ${c.title_render} (${c.filing_count} filings)`);

      // Reassign filings from c to canonical
      try {
        await sb(`filings?case_id=eq.${c.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ case_id: canonical.id })
        });
        filingsReassigned += c.filing_count || 0;
      } catch (e) {
        console.log(`    Warning: Could not reassign filings: ${e.message}`);
      }

      // Actually delete the merged case
      try {
        await sb(`cases?id=eq.${c.id}`, {
          method: 'DELETE'
        });
        casesDeleted++;
      } catch (e) {
        console.log(`    Warning: Could not delete case: ${e.message.slice(0, 100)}`);
      }
    }

    // Update canonical case filing_count
    const newFilingCount = (canonical.filing_count || 0) + filingsReassigned;
    try {
      await sb(`cases?id=eq.${canonical.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ filing_count: newFilingCount })
      });
    } catch (e) {
      // Ignore - might be a trigger handling this
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`\n--- Progress: ${processed}/${mergeClusters.length} clusters, ${casesDeleted} cases merged ---`);
    }
  }

  console.log('\n=== Done ===');
  console.log(`Clusters processed: ${processed}`);
  console.log(`Cases merged: ${casesDeleted}`);
  console.log(`Filings reassigned: ${filingsReassigned}`);
  console.log(`Remaining live cases: ~${allCases.length - casesDeleted}`);
}

main().catch(console.error);
