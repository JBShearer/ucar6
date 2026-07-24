// Fix stub URLs in existing filings
// Run with: node scripts/fix_stub_urls.mjs

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

async function searchGoogle(headline, domain) {
  // Use DuckDuckGo HTML search (no API key needed)
  const query = encodeURIComponent(`${headline} site:${domain}`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    });
    const html = await res.text();

    // Extract first result URL
    const match = html.match(/href="(https:\/\/[^"]*bbc[^"]*news[^"]*)"/i);
    if (match) {
      // Clean up the URL (remove DuckDuckGo redirect params)
      let foundUrl = match[1];
      if (foundUrl.includes('uddg=')) {
        const decoded = decodeURIComponent(foundUrl.split('uddg=')[1].split('&')[0]);
        foundUrl = decoded;
      }
      return foundUrl;
    }
  } catch (e) {
    console.log(`  Search failed: ${e.message}`);
  }
  return null;
}

async function main() {
  console.log('=== Fix Stub URLs ===\n');

  // Find filings with stub URLs
  const stubPatterns = ['sounds/play', 'iplayer', 'live:', 'podcasts/', 'radio/'];

  for (const pattern of stubPatterns) {
    const filings = await sb(`filings?select=id,headline,source_url,source_domain&source_url=like.*${pattern}*&limit=50`);

    if (filings.length === 0) continue;

    console.log(`Found ${filings.length} filings with "${pattern}" URLs:\n`);

    for (const f of filings) {
      console.log(`  ${f.headline.slice(0, 50)}...`);
      console.log(`  Old: ${f.source_url}`);

      const realUrl = await searchGoogle(f.headline, f.source_domain);

      if (realUrl && !realUrl.includes(pattern)) {
        console.log(`  New: ${realUrl}`);
        await sb(`filings?id=eq.${f.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ source_url: realUrl })
        });
        console.log(`  ✓ Updated\n`);
      } else {
        console.log(`  ✗ Could not find real article\n`);
      }

      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }
  }

  console.log('Done!');
}

main().catch(console.error);
