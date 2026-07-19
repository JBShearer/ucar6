// Backfill og:image for existing filings that don't have images
// Fetches the source_url and extracts og:image

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

function extractOgImage(html) {
  // Try og:image first
  let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (match) return match[1];

  // Fallback to twitter:image
  match = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (match) return match[1];

  return null;
}

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

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UCARBot/6.0' }
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function main() {
  console.log('=== Backfilling og:image for filings ===\n');

  // Get filings without images - newest first so recent articles get images first
  const filings = await sb('filings?image_url=is.null&status=eq.live&select=id,source_url,headline&order=created_at.desc&limit=100');
  console.log(`Found ${filings.length} filings without images\n`);

  let updated = 0;
  let failed = 0;
  let noImage = 0;

  for (const f of filings) {
    try {
      const html = await fetchWithTimeout(f.source_url);
      const ogImage = extractOgImage(html);

      if (ogImage) {
        await sb(`filings?id=eq.${f.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ image_url: ogImage })
        });
        console.log(`✓ ${f.headline.slice(0, 50)}`);
        console.log(`  ${ogImage.slice(0, 80)}`);
        updated++;
      } else {
        console.log(`- No image: ${f.headline.slice(0, 50)}`);
        noImage++;
      }
    } catch (e) {
      console.log(`✗ Error: ${f.headline.slice(0, 40)} - ${e.message}`);
      failed++;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated} | No image: ${noImage} | Failed: ${failed}`);
}

main().catch(console.error);
