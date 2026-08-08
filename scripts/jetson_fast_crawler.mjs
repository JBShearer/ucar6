
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Jetson Fast Browser Crawler for UCAR
// Continuously scrapes articles using headless Chromium
// Discovers from RSS feeds AND fetches article content

import puppeteer from 'puppeteer-core';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_KEY = '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87';

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

// RSS feeds to crawl
const RSS_FEEDS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.wired.com/feed/tag/ai/latest/rss',
  'https://themarkup.org/feeds/rss.xml',
  'https://www.eff.org/rss/updates.xml',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.propublica.org/feeds/propublica/main',
  'https://404media.co/rss/',
  'https://www.technologyreview.com/feed/',
  'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
  'https://algorithmwatch.org/en/feed/',
  'https://restofworld.org/feed/latest/',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://arstechnica.com/tag/artificial-intelligence/feed/',
  'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
  'https://venturebeat.com/category/ai/feed/',
  'https://news.ycombinator.com/rss',
];

const AI_TERMS = ["ai","artificial intelligence","machine learning","algorithm","facial recognition","llm","large language model","chatbot","neural","deep learning","gpt","claude","gemini","copilot","computer vision","biometric","deepfake","autonomous","predictive","generative"];
const DEPLOY_TERMS = ["deploy","launch","roll out","use","using","adopt","implement","introduce","pilot","ban","lawsuit","arrest","deny","monitor","surveil","track","scan"];
const HARM_TERMS = ["privacy","surveillance","bias","discrimination","wrongful","error","harm","abuse","exploit","breach","misinformation","scam","fraud"];

function score(text) {
  const t = text.toLowerCase();
  let s = 0;
  for (const w of AI_TERMS) if (t.includes(w)) s += 2;
  for (const w of DEPLOY_TERMS) if (t.includes(w)) s += 1;
  for (const w of HARM_TERMS) if (t.includes(w)) s += 1;
  return s;
}

const PROMOTE_THRESHOLD = 6;

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

function extractOgImage(html) {
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];
  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twMatch) return twMatch[1];
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#\d+;|&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFeed(xml) {
  const items = [];
  const grab = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;
  };
  // RSS 2.0
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const url = grab(m[0], 'link');
    const title = grab(m[0], 'title');
    if (url && title) items.push({ url, title });
  }
  // Atom
  for (const m of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)) {
    const href = m[0].match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const title = grab(m[0], 'title');
    if (href && title) items.push({ url: href, title });
  }
  return items.slice(0, 30);
}

async function fetchWithBrowser(browser, url, timeout = 20000) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await new Promise(r => setTimeout(r, 1500));
    return await page.content();
  } finally {
    await page.close();
  }
}

async function discoverFromFeeds(browser) {
  let discovered = 0;
  for (const feedUrl of RSS_FEEDS) {
    try {
      const html = await fetchWithBrowser(browser, feedUrl, 15000);
      const items = parseFeed(html);
      for (const item of items) {
        try {
          await sb('prospects', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
            body: JSON.stringify({
              url: item.url,
              title: item.title.slice(0, 300),
              source_name: new URL(feedUrl).hostname,
              status: 'found'
            })
          });
          discovered++;
        } catch (e) {
          // Duplicate, ignore
        }
      }
    } catch (e) {
      console.log(`  Feed error ${feedUrl.slice(0, 40)}: ${e.message.slice(0, 30)}`);
    }
  }
  return discovered;
}

async function fetchArticle(browser, prospect) {
  const { id, url, title } = prospect;
  try {
    const html = await fetchWithBrowser(browser, url);
    const text = stripHtml(html).slice(0, 20000);
    if (text.length < 500) throw new Error('too little text');

    const s = score(`${title} ${text.slice(0, 4000)}`);
    const status = s >= PROMOTE_THRESHOLD ? 'promoted' : 'rejected';
    const ogImage = extractOgImage(html);

    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        score: s,
        raw_text: status === 'promoted' ? text : null,
        og_image: ogImage,
        updated_at: new Date().toISOString()
      })
    });
    return { status, score: s };
  } catch (e) {
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'error', error: e.message?.slice(0, 300), updated_at: new Date().toISOString() })
    });
    return { status: 'error', error: e.message };
  }
}

async function main() {
  console.log('=== Jetson Fast Browser Crawler ===');
  console.log(`Chromium: ${CHROMIUM_PATH}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  console.log('Browser launched.\n');

  let totalDiscovered = 0, totalFetched = 0, totalPromoted = 0;

  try {
    while (true) {
      const time = new Date().toLocaleTimeString();

      // Discover from feeds
      const discovered = await discoverFromFeeds(browser);
      totalDiscovered += discovered;
      console.log(`[${time}] Discovered ${discovered} URLs from RSS feeds`);

      // Fetch articles in 'found' status
      const batch = await sb('prospects?status=eq.found&select=id,url,title&order=discovered_at&limit=20');

      if (batch.length > 0) {
        console.log(`[${time}] Fetching ${batch.length} articles...`);
        for (const p of batch) {
          const result = await fetchArticle(browser, p);
          totalFetched++;
          if (result.status === 'promoted') {
            totalPromoted++;
            process.stdout.write('✓');
          } else if (result.status === 'rejected') {
            process.stdout.write('-');
          } else {
            process.stdout.write('✗');
          }
        }
        console.log(` (promoted=${totalPromoted})`);
      }

      console.log(`  Totals: discovered=${totalDiscovered} fetched=${totalFetched} promoted=${totalPromoted}`);

      // Brief pause between cycles
      await new Promise(r => setTimeout(r, 5000));
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
