// Rescrape existing filings to extract published_at dates
// Run with: node scripts/rescrape_dates.mjs

const HYPERSPACE_URL = 'http://localhost:6655/anthropic/v1/messages';
const HYPERSPACE_TOKEN = '__PURGED_TOKEN__';
const MODEL = 'claude-sonnet-4-20250514'; // Fast model for date extraction

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const DATE_PROMPT = `Extract the publication date from this article. Look for:
- Byline dates ("Published:", "Posted:", date near author name)
- Meta dates in the URL or text
- Any explicit date mentions for when this was written

Return ONLY a JSON object:
{"published_at": "YYYY-MM-DD"} or {"published_at": null} if no date found.

ARTICLE URL: `;

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

async function fetchAndExtractDate(url) {
  try {
    // Fetch the page
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UCARBot/1.0)' },
      timeout: 10000
    });

    if (!pageRes.ok) return null;

    const html = await pageRes.text();

    // Quick regex checks first (faster than LLM)
    const datePatterns = [
      /datetime="(\d{4}-\d{2}-\d{2})/,
      /published.*?(\d{4}-\d{2}-\d{2})/i,
      /datePublished.*?(\d{4}-\d{2}-\d{2})/i,
      /"date":\s*"(\d{4}-\d{2}-\d{2})/,
      /(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/
    ];

    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2027) {
          return match[1];
        }
      }
    }

    // Fall back to LLM for tricky cases
    const snippet = html.slice(0, 5000); // First 5k chars usually has the date

    const llmRes = await fetch(HYPERSPACE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HYPERSPACE_TOKEN}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: DATE_PROMPT + url + '\n\nPAGE CONTENT:\n' + snippet
        }]
      })
    });

    if (!llmRes.ok) return null;

    const data = await llmRes.json();
    const content = data.content?.[0]?.text || '';
    const clean = content.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return parsed.published_at;
    } catch {
      return null;
    }

  } catch (err) {
    console.error(`Error fetching ${url}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Rescrape Dates ===\n');

  // Get filings without published_at
  let offset = 0;
  let total = 0;
  let updated = 0;
  let failed = 0;

  while (true) {
    const batch = await sb(
      `filings?select=id,source_url,headline&published_at=is.null&status=eq.live&order=created_at.desc&offset=${offset}&limit=50`
    );

    if (batch.length === 0) break;

    console.log(`\nProcessing batch at offset ${offset} (${batch.length} filings)...`);

    for (const filing of batch) {
      process.stdout.write(`  ${filing.headline.slice(0, 50)}... `);

      const date = await fetchAndExtractDate(filing.source_url);

      if (date) {
        await sb(`filings?id=eq.${filing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ published_at: date })
        });
        console.log(`✓ ${date}`);
        updated++;
      } else {
        console.log('✗ no date');
        failed++;
      }

      total++;

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    offset += batch.length;

    console.log(`\n--- Progress: ${total} processed, ${updated} updated, ${failed} no date ---`);

    // Safety limit
    if (total >= 500) {
      console.log('\nReached batch limit (500). Run again to continue.');
      break;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Updated: ${updated} | No date: ${failed}`);
}

main().catch(console.error);
