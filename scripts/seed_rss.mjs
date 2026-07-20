#!/usr/bin/env node
// Seed prospects directly from news site RSS feeds (no Google News)

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const sb = createClient(
  'https://znhsnishdqrmumxbgobq.supabase.co',
  '__PURGED_SUPABASE_KEY__',
  { realtime: { transport: ws } }
);

const RSS_FEEDS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.wired.com/feed/tag/ai/latest/rss',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.technologyreview.com/feed/',
  'https://thenextweb.com/feed/',
  'https://venturebeat.com/category/ai/feed/',
  'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://themarkup.org/feeds/rss.xml',
  'https://www.eff.org/rss/updates.xml',
  'https://404media.co/rss/',
  'https://restofworld.org/feed/latest/',
  'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
  'https://www.engadget.com/rss.xml',
  'https://diginomica.com/feed',
  'https://siliconangle.com/category/ai/feed/',
  'https://bair.berkeley.edu/blog/feed.xml',
  'https://openai.com/blog/rss/',
  'https://www.anthropic.com/news/feed.xml',
];

function extractLinks(rss) {
  const links = [];
  // Match <link>url</link>
  for (const m of rss.matchAll(/<link>([^<]+)<\/link>/g)) {
    const url = m[1].trim();
    if (url.startsWith('http') && !url.includes('feed') && !url.includes('/rss')) {
      links.push(url);
    }
  }
  // Match <link href="url"/>
  for (const m of rss.matchAll(/<link[^>]+href=["']([^"']+)["']/g)) {
    const url = m[1].trim();
    if (url.startsWith('http') && !url.includes('feed') && !url.includes('/rss')) {
      links.push(url);
    }
  }
  // Match <guid>url</guid>
  for (const m of rss.matchAll(/<guid[^>]*>([^<]+)<\/guid>/g)) {
    const url = m[1].trim();
    if (url.startsWith('http')) {
      links.push(url);
    }
  }
  return [...new Set(links)];
}

async function fetchFeed(feedUrl) {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UCARBot/1.0)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    return extractLinks(await res.text());
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('=== Seeding from direct RSS feeds ===\n');
  
  // Get existing URLs
  const { data: existing } = await sb.from('prospects').select('url');
  const existingUrls = new Set(existing?.map(r => r.url) || []);
  
  // Also check filings
  const { data: filings } = await sb.from('filings').select('source_url');
  filings?.forEach(f => existingUrls.add(f.source_url));
  console.log(`Existing URLs: ${existingUrls.size}`);
  
  const allUrls = new Set();
  
  for (const feed of RSS_FEEDS) {
    const name = new URL(feed).hostname.replace('www.', '');
    process.stdout.write(`${name}...`);
    const urls = await fetchFeed(feed);
    const newUrls = urls.filter(u => !existingUrls.has(u));
    newUrls.forEach(u => allUrls.add(u));
    console.log(` ${urls.length} → ${newUrls.length} new`);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nTotal new URLs: ${allUrls.size}`);
  
  if (allUrls.size === 0) {
    console.log('No new URLs found.');
    process.exit(0);
  }
  
  let inserted = 0;
  for (const url of allUrls) {
    const { error } = await sb.from('prospects').insert({
      url,
      status: 'promoted',
      source_name: 'rss-direct'
    });
    if (!error) inserted++;
  }
  
  console.log(`Inserted: ${inserted}`);
  
  const { count } = await sb.from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'promoted')
    .is('raw_text', null);
  console.log(`Ready to fetch: ${count}`);
}

main().catch(console.error).finally(() => process.exit(0));
