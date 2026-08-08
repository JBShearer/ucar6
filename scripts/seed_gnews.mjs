
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Seed prospects from Google News RSS for AI topics

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const sb = createClient(
  'https://znhsnishdqrmumxbgobq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

// Google News RSS search queries
const QUERIES = [
  'artificial intelligence',
  'AI chatbot',
  'machine learning',
  'ChatGPT',
  'generative AI',
  'AI regulation',
  'facial recognition',
  'autonomous vehicles',
  'AI jobs',
  'deepfake',
  'AI healthcare',
  'AI military',
  'AI surveillance',
  'OpenAI',
  'Anthropic Claude',
  'Google Gemini'
];

function extractLinks(rss) {
  const links = [];
  const matches = rss.matchAll(/<link>([^<]+)<\/link>/g);
  for (const m of matches) {
    const url = m[1].trim();
    if (url.startsWith('http') && !url.includes('google.com/news') && !url.includes('support.google')) {
      links.push(url);
    }
  }
  return [...new Set(links)];
}

async function fetchGoogleNews(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UCARBot/1.0)' }
    });
    if (!res.ok) return [];
    const text = await res.text();
    return extractLinks(text);
  } catch (e) {
    console.log(`  Error fetching "${query}":`, e.message);
    return [];
  }
}

async function main() {
  console.log('=== Seeding Prospects from Google News ===\n');
  
  // Get existing URLs to avoid duplicates
  const { data: existing } = await sb.from('prospects').select('url');
  const existingUrls = new Set(existing?.map(r => r.url) || []);
  console.log(`Existing prospects: ${existingUrls.size}`);
  
  const allUrls = new Set();
  
  for (const query of QUERIES) {
    process.stdout.write(`Fetching "${query}"...`);
    const urls = await fetchGoogleNews(query);
    const newUrls = urls.filter(u => !existingUrls.has(u));
    newUrls.forEach(u => allUrls.add(u));
    console.log(` ${urls.length} links, ${newUrls.length} new`);
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\nNew unique URLs to insert: ${allUrls.size}`);
  
  if (allUrls.size === 0) {
    console.log('No new URLs found.');
    process.exit(0);
  }
  
  // Insert into prospects table with 'promoted' status (ready for extraction)
  let inserted = 0, errors = 0;
  for (const url of allUrls) {
    const { error } = await sb.from('prospects').insert({
      url,
      status: 'promoted',
      source_name: 'gnews-seed'
    });
    if (error) {
      errors++;
      if (errors < 3) console.log('Insert error:', error.message);
    } else {
      inserted++;
    }
  }
  
  console.log(`\nInserted: ${inserted} | Errors: ${errors}`);
  
  // Check final count
  const { count } = await sb.from('prospects').select('*', { count: 'exact', head: true }).eq('status', 'promoted');
  console.log(`Prospects ready for extraction: ${count}`);
}

main().catch(console.error).finally(() => process.exit(0));
