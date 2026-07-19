#!/usr/bin/env node
// Jetson UCAR Pipeline - Crawl + Extract via Hyperspace
// Run this on the Jetson where Hyperspace is running

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const ADMIN_KEY = '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'anthropic--claude-4.8-opus';

const PROMPT = `Extract for UCAR docket. The output will become a case title: "[VERB] [OBJECT] · WITH [INSTRUMENT]"

GRAMMATICAL RULE - MANDATORY:
The final title MUST be grammatically correct English. Test it: "AI [verb]s [object]" must make sense.
✓ "AI generates video" - correct
✓ "AI tracks users" - correct
✓ "AI automates research" - correct
✗ "AI develops researchers" - WRONG (you develop skills, not people)
✗ "AI generates children" - WRONG (you can't generate people)

PEOPLE ARE NEVER THE OBJECT OF CREATIVE VERBS:
- GENERATE, CREATE, PRODUCE, DEVELOP, BUILD → objects are THINGS (video, images, text, code, music)
- If people are affected by generated content → use HARM, EXPLOIT, DECEIVE, TARGET and people as object

Return JSON only (no markdown):
{
  "skip": false,
  "headline": "short title",
  "summary": "1-2 sentences",
  "verb": "GENERATE|CLASSIFY|DETECT|EXPLOIT|SURVEIL|DISCRIMINATE|DECEIVE|RECOMMEND|ANALYZE|HARM|AUTOMATE|ASSIST|TARGET|etc",
  "object_class": "video|images|text|audio|code|research|users|workers|children|patients|etc",
  "instrument": "generative ai|large language models|chatbots|neural networks|facial recognition|etc",
  "domain": "research|entertainment|consumer|healthcare|law enforcement|etc",
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

async function runCrawler() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/crawler?action=run`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: '{}'
  });
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
      messages: [{ role: 'user', content: PROMPT + text.slice(0, 12000) }]
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
  const existing = await sb(`vocab_terms?kind=eq.${kind}&term=eq.${encodeURIComponent(norm)}&limit=1`);
  if (existing.length > 0) return { id: existing[0].id, term: existing[0].term };
  const created = await sb('vocab_terms', {
    method: 'POST',
    body: JSON.stringify({ kind, term: norm, status: 'active' })
  });
  return { id: created[0].id, term: created[0].term };
}

async function processOne(prospect) {
  const { id, url, title, raw_text, og_image } = prospect;

  try {
    const result = await callOpus(raw_text);

    if (result.skip) {
      await sb(`prospects?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'skipped', error: result.reason?.slice(0, 200) })
      });
      return { skipped: true };
    }

    const verb = await getOrCreateTerm('verb', result.verb);
    const obj = await getOrCreateTerm('object_class', result.object_class);
    const inst = await getOrCreateTerm('instrument', result.instrument);

    if (!verb || !inst) throw new Error('Missing verb or instrument');

    const titleParts = [verb.term.toUpperCase()];
    if (obj) titleParts.push(obj.term.toUpperCase());
    titleParts.push('·', 'WITH', inst.term.toUpperCase());
    const caseTitle = titleParts.join(' ');

    let caseId;
    const existingCase = await sb(`cases?title_render=eq.${encodeURIComponent(caseTitle)}&limit=1`);

    if (existingCase.length > 0) {
      caseId = existingCase[0].id;
    } else {
      const newCase = await sb('cases', {
        method: 'POST',
        body: JSON.stringify({
          verb_id: verb.id,
          object_class_id: obj?.id || null,
          instrument_id: inst.id,
          title_render: caseTitle,
          domain: result.domain?.toLowerCase() || null,
          status: 'live'
        })
      });
      caseId = newCase[0].id;
    }

    const sourceDomain = new URL(url).hostname.replace(/^www\./, '');
    await sb('filings', {
      method: 'POST',
      body: JSON.stringify({
        case_id: caseId,
        headline: result.headline?.slice(0, 300) || title,
        summary: result.summary?.slice(0, 500) || '',
        subject: result.subject || null,
        source_url: url,
        source_domain: sourceDomain,
        domain: result.domain?.toLowerCase() || null,
        impact: result.impact || 3,
        image_url: og_image || null,
        status: 'live'
      })
    });

    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'extracted' })
    });

    console.log(`  ✓ ${caseTitle}`);
    return { extracted: true };

  } catch (err) {
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'error', error: err.message?.slice(0, 300) })
    });
    console.log(`  ✗ ${title.slice(0, 40)}: ${err.message?.slice(0, 40)}`);
    return { error: true };
  }
}

async function runExtraction() {
  const batch = await sb('prospects?select=id,url,title,raw_text,og_image&status=eq.promoted&raw_text=not.is.null&order=discovered_at&limit=10');

  let extracted = 0, skipped = 0, errors = 0;
  for (const p of batch) {
    const result = await processOne(p);
    if (result.extracted) extracted++;
    if (result.skipped) skipped++;
    if (result.error) errors++;
  }

  return { processed: batch.length, extracted, skipped, errors };
}

async function main() {
  console.log('=== Jetson UCAR Pipeline (Crawl + Extract) ===');
  console.log(`Hyperspace: ${HYPERSPACE_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  let cycles = 0;

  while (true) {
    cycles++;
    const time = new Date().toLocaleTimeString();

    try {
      // Crawl
      const crawl = await runCrawler();
      console.log(`[${time}] Crawl: discovered=${crawl.discovered} fetched=${crawl.fetched} promoted=${crawl.promoted}`);

      // Extract if there are promoted prospects
      if (crawl.promoted > 0 || cycles === 1) {
        const extract = await runExtraction();
        console.log(`[${time}] Extract: processed=${extract.processed} extracted=${extract.extracted} skipped=${extract.skipped}`);
      }

    } catch (err) {
      console.error(`[${time}] Error: ${err.message}`);
    }

    // Wait 3 minutes between cycles
    await new Promise(r => setTimeout(r, 180000));
  }
}

main().catch(console.error);
