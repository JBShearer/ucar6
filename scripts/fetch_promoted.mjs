
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Fetch content for promoted prospects (direct URLs only)

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const sb = createClient(
  'https://znhsnishdqrmumxbgobq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

const CONCURRENCY = 5;
const BATCH_SIZE = 30;

function extractText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractTitle(html) {
  const og = extractMeta(html, 'og:title');
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

async function fetchOne(prospect) {
  try {
    // Skip Google News URLs
    if (prospect.url.includes('news.google.com')) {
      await sb.from('prospects').update({ status: 'skipped' }).eq('id', prospect.id);
      return { status: 'skipped' };
    }
    
    const res = await fetch(prospect.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    
    if (!res.ok) {
      await sb.from('prospects').update({ status: 'error' }).eq('id', prospect.id);
      return { status: 'error' };
    }
    
    const html = await res.text();
    const title = extractTitle(html);
    const raw_text = extractText(html);
    const og_image = extractMeta(html, 'og:image');
    
    if (raw_text.length < 500) {
      await sb.from('prospects').update({ status: 'skipped' }).eq('id', prospect.id);
      return { status: 'skipped' };
    }
    
    await sb.from('prospects').update({ title, raw_text, og_image }).eq('id', prospect.id);
    return { status: 'fetched' };
  } catch (e) {
    await sb.from('prospects').update({ status: 'error' }).eq('id', prospect.id);
    return { status: 'error' };
  }
}

async function main() {
  console.log('=== Fetching promoted prospects ===\n');
  
  let total = 0, fetched = 0, skipped = 0, errors = 0;
  
  while (true) {
    const { data: batch } = await sb.from('prospects')
      .select('id, url')
      .eq('status', 'promoted')
      .is('raw_text', null)
      .not('url', 'like', '%news.google.com%')
      .limit(BATCH_SIZE);
    
    if (!batch || batch.length === 0) break;
    
    process.stdout.write(`[${batch.length}]`);
    
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(fetchOne));
      
      for (const r of results) {
        total++;
        if (r.status === 'fetched') { fetched++; process.stdout.write('✓'); }
        else if (r.status === 'skipped') { skipped++; process.stdout.write('.'); }
        else { errors++; process.stdout.write('x'); }
      }
    }
    
    if (total >= 150) break;
  }
  
  console.log(`\n\nTotal: ${total} | Fetched: ${fetched} | Skipped: ${skipped} | Errors: ${errors}`);
  
  const { count } = await sb.from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'promoted')
    .not('raw_text', 'is', null);
  console.log(`Ready for extraction: ${count}`);
}

main().catch(console.error).finally(() => process.exit(0));
