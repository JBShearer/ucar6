// Local extraction via Hyperspace with Opus
// Uses the same vocab resolution as the edge function

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_EMBED_URL = 'http://localhost:6655/openai/v1/embeddings';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'anthropic--claude-4.8-opus';
const EMBED_MODEL = 'text-embedding-3-small';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const PROMPT = `Extract for UCAR docket. The output becomes a case title: "[VERB] [OBJECT] · WITH [INSTRUMENT]"

EXTRACT LIBERALLY! If an article describes what AI CAN do, IS doing, COULD do, or WILL do — that's a use case. Include:
- Deployed systems ("Company X uses AI to...")
- Research demos ("Researchers show AI can...")
- Product announcements ("ChatGPT can now...")
- Capabilities ("AI is able to...")
- Proposals ("AI could be used to...")

Only skip if the article has NO AI use case at all (pure business news, funding rounds with no product details, opinion pieces about AI policy with no specific application).

BE SPECIFIC - NOT GENERIC!

BAD (too vague):
- "ANALYZE RESEARCH" - what kind of research? what analysis?
- "ASSIST USERS" - assist how?
- "AUTOMATE TASKS" - what tasks?
- "GENERATE CONTENT" - what content?

GOOD (specific and meaningful):
- "DIAGNOSE CANCER" not "ANALYZE PATIENTS"
- "GRADE ESSAYS" not "ANALYZE TEXT"
- "DETECT DEEPFAKES" not "CLASSIFY IMAGES"
- "WRITE CODE" not "GENERATE TEXT"
- "COMPOSE MUSIC" not "GENERATE AUDIO"
- "DENY LOANS" not "CLASSIFY APPLICANTS"
- "SCREEN RESUMES" not "ANALYZE TEXT"
- "PREDICT RECIDIVISM" not "ANALYZE DATA"
- "FLAG PROTESTERS" not "DETECT PEOPLE"

VERB should describe the SPECIFIC ACTION:
- Medical: DIAGNOSE, TRIAGE, PREDICT (disease), PRESCRIBE
- Legal: PREDICT (verdict), ASSESS (risk), DENY, APPROVE
- Creative: WRITE, COMPOSE, ILLUSTRATE, ANIMATE, VOICE
- Surveillance: IDENTIFY, TRACK, MONITOR, FLAG, PROFILE
- Employment: SCREEN, RANK, SCORE, HIRE, FIRE
- Finance: APPROVE, DENY, PRICE, UNDERWRITE
- Moderation: BAN, FLAG, REMOVE, SHADOWBAN, DEMONETIZE

OBJECT should be WHAT is acted upon:
- Documents: resumes, essays, contracts, patents, papers
- People by role: applicants, defendants, patients, students, drivers
- Content: deepfakes, spam, misinformation, CSAM
- Decisions: loans, bail, benefits, insurance claims

INSTRUMENT should be the SPECIFIC TECHNOLOGY:
- "chatbots" for conversational AI
- "facial recognition" for face-based ID
- "recommendation algorithms" for content curation
- "predictive models" for risk scoring
- "computer vision" for image analysis
- "voice cloning" for audio synthesis
- "diffusion models" for image generation
- Only use "large language models" if it's truly about LLMs specifically

IMPORTANT - AI AS TARGET (not always the attacker!):
When AI systems ARE THE VICTIM of attacks, hacks, or exploits:
- VERB = what attackers do TO the AI (hijack, poison, jailbreak, trick, exploit, fool, manipulate)
- OBJECT = the AI system being attacked (AI agents, chatbots, language models, vision models)
- INSTRUMENT = the attack method (prompt injection, data poisoning, adversarial examples, jailbreaks)

Examples of AI-as-target:
✓ "HIJACK AI AGENTS · WITH DATA INJECTION" - attackers manipulate AI agents
✓ "JAILBREAK CHATBOTS · WITH PROMPT INJECTION" - bypassing AI safety
✓ "POISON TRAINING DATA · WITH BACKDOOR ATTACKS" - corrupting AI models
✓ "FOOL VISION MODELS · WITH ADVERSARIAL PATCHES" - tricking AI perception

✗ WRONG: "HIJACK DEVELOPER MACHINES · WITH AI AGENTS" - this flips victim/attacker!
The AI agent is being hijacked, not doing the hijacking.

GRAMMAR CHECK: "AI [verb]s [object]" must be valid English.
✗ "AI generates children" - WRONG
✗ "AI develops researchers" - WRONG
✓ "AI screens resumes" - CORRECT
✓ "AI denies loans" - CORRECT

ARTICLE QUOTE: Extract ONE punchy quote (10-25 words) from the article that captures the stakes or controversy. Look for:
- A damning admission or statistic
- A victim's statement
- An expert warning
- A company's defense that sounds hollow
If no good quote exists, use null.

PUBLISHED DATE: Extract the article's original publication date if mentioned (look for "Published:", date bylines, etc). Return as ISO format (YYYY-MM-DD) or null if not found.

DOMAIN must be one of these exact values (pick the best fit):
healthcare, finance, employment, law enforcement, education, social media, government, military, retail, transportation, entertainment, research, cybersecurity, manufacturing, legal

Return JSON only:
{
  "skip": false,
  "headline": "short title",
  "summary": "1-2 sentences",
  "article_quote": "extracted quote from article or null",
  "published_at": "YYYY-MM-DD or null",
  "verb": "specific action verb",
  "object_class": "specific object",
  "instrument": "specific AI technology OR attack method if AI is the target",
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
      console.log(`- Skip: ${title.slice(0, 60)}`);
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

    // Find or create case
    let caseId;
    const existingCase = await sb(`cases?title_render=eq.${encodeURIComponent(caseTitle)}&limit=1`);

    if (existingCase.length > 0) {
      caseId = existingCase[0].id;
    } else {
      // Generate embedding for new case
      const embedding = await getEmbedding(`${caseTitle} ${result.domain || ''}`);

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
    }

    // Create filing (upsert to handle duplicates)
    const sourceDomain = new URL(url).hostname.replace(/^www\./, '');

    const filingResult = await sb('filings', {
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

    // Update case filing_count and last_filed_at
    const caseData = await sb(`cases?id=eq.${caseId}&select=filing_count`);
    const currentCount = caseData[0]?.filing_count || 0;
    await sb(`cases?id=eq.${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        filing_count: currentCount + 1,
        last_filed_at: new Date().toISOString()
      })
    });

    // Mark extracted
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'extracted' })
    });

    console.log(`✓ ${caseTitle}`);
    return { extracted: true, caseTitle };

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
  console.log('=== Local Extraction via Hyperspace (Opus) ===');
  console.log(`Model: ${MODEL}\n`);

  let processed = 0;
  let extracted = 0;
  let skipped = 0;
  let errors = 0;

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
    }

    console.log(`--- Processed: ${processed} | Extracted: ${extracted} | Skipped: ${skipped} | Errors: ${errors} ---`);

    // Small delay to be nice
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${processed} | Extracted: ${extracted} | Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch(console.error);
