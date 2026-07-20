// Local extraction v2 - with case consolidation via embeddings
// Uses semantic similarity to merge similar cases instead of exact title match

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_EMBED_URL = 'http://localhost:6655/openai/v1/embeddings';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'anthropic--claude-4.8-opus';
const EMBED_MODEL = 'text-embedding-3-small';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

// Similarity threshold - cases with similarity above this are considered the same
const SIMILARITY_THRESHOLD = 0.85;

const PROMPT = `Extract for UCAR docket. The output becomes a case title: "[VERB] [OBJECT] · WITH [INSTRUMENT]"

EXTRACT LIBERALLY! If an article describes what AI CAN do, IS doing, COULD do, or WILL do — that's a use case.

CRITICAL: USE BROAD, CANONICAL TERMS - NOT HYPER-SPECIFIC VARIANTS!

The goal is to GROUP similar use cases together. Use general terms that capture the category:

INSTRUMENTS - Use these canonical forms:
✓ "autonomous robots" NOT "autonomous sidewalk robots", "delivery robots", "warehouse robots"
✓ "humanoid robots" for bipedal human-form robots specifically
✓ "computer vision" NOT "facial recognition" (unless specifically face-based ID)
✓ "large language models" or "chatbots" NOT company-specific names
✓ "diffusion models" or "image generators" NOT "Midjourney", "DALL-E", "Stable Diffusion"
✓ "voice synthesis" or "voice cloning" NOT brand names
✓ "recommendation algorithms" for any content curation
✓ "autonomous vehicles" NOT "robotaxis", "self-driving cars"

VERBS - Use the most general applicable verb:
✓ "DELIVER" covers food, packages, groceries, parcels
✓ "GENERATE" covers create, produce, synthesize (for content)
✓ "DETECT" covers identify, recognize, spot, find
✓ "MONITOR" covers surveil, watch, track, observe
✓ "AUTOMATE" covers handle, manage, process (for tasks)

OBJECTS - Use categorical terms:
✓ "packages" covers food, groceries, parcels, deliveries
✓ "content" covers text, images, videos when mixed
✓ "workers" covers employees, staff, laborers
✓ "users" covers customers, consumers, people (when generic)

CATEGORY: Also extract a category for the case. Must be one of:
surveillance, automation, content-generation, decision-making, communication,
healthcare, finance, military, transportation, employment, education, legal, research

Return JSON only:
{
  "skip": false,
  "headline": "short title",
  "summary": "1-2 sentences",
  "article_quote": "extracted quote from article or null",
  "published_at": "YYYY-MM-DD or null",
  "verb": "BROAD action verb",
  "object_class": "CATEGORICAL object",
  "instrument": "CANONICAL AI technology",
  "category": "surveillance|automation|content-generation|decision-making|communication|healthcare|finance|military|transportation|employment|education|legal|research",
  "domain": "healthcare|finance|employment|law enforcement|education|social media|government|military|retail|transportation|entertainment|research|cybersecurity|manufacturing|legal",
  "subject": "company/org name or null",
  "impact": 1-5
}

Or if not AI-related: {"skip": true, "reason": "..."}

SOURCE TEXT:
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

async function callOpus(text) {
  const res = await fetch(HYPERSPACE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HYPERSPACE_TOKEN}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: PROMPT + text.slice(0, 12000)
      }]
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

async function getEmbedding(text) {
  const res = await fetch(HYPERSPACE_EMBED_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HYPERSPACE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
      dimensions: 384
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0].embedding;
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

async function getOrCreateTerm(kind, term) {
  if (!term) return null;
  const norm = term.toLowerCase().trim();

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

// Find similar existing case using embedding similarity
async function findSimilarCase(embedding, caseTitle) {
  if (!embedding) return null;

  // First try exact title match (fast path)
  const exactMatch = await sb(`cases?title_render=eq.${encodeURIComponent(caseTitle)}&status=eq.live&limit=1`);
  if (exactMatch.length > 0) {
    return exactMatch[0];
  }

  // Use Supabase's vector similarity search via RPC
  // This requires the pgvector extension and a similarity function
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_cases`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: SIMILARITY_THRESHOLD,
        match_count: 1
      })
    });

    if (res.ok) {
      const matches = await res.json();
      if (matches.length > 0) {
        console.log(`  → Matched to existing: ${matches[0].title_render} (similarity: ${matches[0].similarity.toFixed(3)})`);
        return matches[0];
      }
    }
  } catch (e) {
    // RPC not available, fall back to client-side comparison
  }

  // Fallback: fetch recent cases and compare client-side (less efficient but works)
  // Only compare against cases from the same general domain
  const recentCases = await sb(`cases?status=eq.live&select=id,title_render,embedding&order=created_at.desc&limit=500`);

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const c of recentCases) {
    if (!c.embedding) continue;
    const sim = cosineSimilarity(embedding, c.embedding);
    if (sim > bestSimilarity && sim >= SIMILARITY_THRESHOLD) {
      bestSimilarity = sim;
      bestMatch = c;
    }
  }

  if (bestMatch) {
    console.log(`  → Matched to existing: ${bestMatch.title_render} (similarity: ${bestSimilarity.toFixed(3)})`);
  }

  return bestMatch;
}

async function processOne(prospect) {
  const { id, url, title, raw_text, og_image } = prospect;

  try {
    // Call Opus
    const result = await callOpus(raw_text);

    if (result.skip) {
      await sb(`prospects?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'skipped', error: result.reason?.slice(0, 200) })
      });
      console.log(`- Skip: ${result.reason?.slice(0, 60)}`);
      return { skipped: true };
    }

    // Resolve vocab terms
    const verb = await getOrCreateTerm('verb', result.verb);
    const obj = await getOrCreateTerm('object_class', result.object_class);
    const inst = await getOrCreateTerm('instrument', result.instrument);

    if (!verb || !inst) {
      throw new Error('Missing verb or instrument');
    }

    // Build case title
    const titleParts = [verb.term.toUpperCase()];
    if (obj) titleParts.push(obj.term.toUpperCase());
    titleParts.push('·', 'WITH', inst.term.toUpperCase());
    const caseTitle = titleParts.join(' ');

    // Generate embedding for this case
    const embedding = await getEmbedding(`${caseTitle} ${result.category || result.domain || ''}`);

    // Find similar existing case OR create new one
    let caseId;
    let matchedCase = await findSimilarCase(embedding, caseTitle);

    if (matchedCase) {
      caseId = matchedCase.id;
    } else {
      // Create new case
      const newCase = await sb('cases', {
        method: 'POST',
        body: JSON.stringify({
          verb_id: verb.id,
          object_class_id: obj?.id || null,
          instrument_id: inst.id,
          title_render: caseTitle,
          domain: result.domain?.toLowerCase() || null,
          embedding: embedding,
          status: 'live'
        })
      });
      caseId = newCase[0].id;
      console.log(`✓ NEW: ${caseTitle}`);
    }

    // Create filing
    const sourceDomain = new URL(url).hostname.replace(/^www\./, '');

    await sb('filings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        case_id: caseId,
        headline: result.headline?.slice(0, 300) || title,
        summary: result.summary?.slice(0, 500) || '',
        article_quote: result.article_quote?.slice(0, 500) || null,
        published_at: result.published_at || null,
        subject: result.subject || null,
        source_url: url,
        source_domain: sourceDomain,
        domain: result.domain?.toLowerCase() || null,
        impact: result.impact || 3,
        image_url: og_image || null,
        status: 'live'
      })
    });

    // Mark extracted
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'extracted' })
    });

    if (!matchedCase) {
      return { extracted: true, caseTitle, newCase: true };
    } else {
      console.log(`✓ MERGED: ${title.slice(0, 50)}... → ${matchedCase.title_render}`);
      return { extracted: true, caseTitle: matchedCase.title_render, merged: true };
    }

  } catch (err) {
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'error', error: err.message?.slice(0, 300) })
    });
    console.log(`✗ Error: ${title.slice(0, 50)} - ${err.message?.slice(0, 50)}`);
    return { error: true };
  }
}

async function main() {
  console.log('=== Local Extraction v2 (with case consolidation) ===');
  console.log(`Model: ${MODEL}`);
  console.log(`Similarity threshold: ${SIMILARITY_THRESHOLD}\n`);

  let processed = 0;
  let extracted = 0;
  let skipped = 0;
  let errors = 0;
  let newCases = 0;
  let merged = 0;

  while (true) {
    // Get batch of prospects
    const batch = await sb('prospects?select=id,url,title,raw_text,og_image&status=eq.promoted&raw_text=not.is.null&order=discovered_at&limit=10');

    if (batch.length === 0) {
      console.log('\n=== Queue empty ===');
      break;
    }

    for (const p of batch) {
      const result = await processOne(p);
      processed++;
      if (result.extracted) extracted++;
      if (result.skipped) skipped++;
      if (result.error) errors++;
      if (result.newCase) newCases++;
      if (result.merged) merged++;
    }

    console.log(`--- Processed: ${processed} | New: ${newCases} | Merged: ${merged} | Skipped: ${skipped} | Errors: ${errors} ---`);

    // Small delay to be nice
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${processed} | Extracted: ${extracted} (${newCases} new, ${merged} merged) | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch(console.error);
