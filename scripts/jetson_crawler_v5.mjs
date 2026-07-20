#!/usr/bin/env node
// Jetson Crawler v5 - Optimized for throughput
// - Top 50 RSS feeds only (highest yield)
// - Fetch 50 articles per batch
// - Fetch BETWEEN discovery phases, not after
// - Skip Google News (too slow, URLs fail)

import puppeteer from 'puppeteer-core';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

// TOP 50 RSS feeds by extraction yield
const RSS_FEEDS = [
  // arXiv - top producer
  { url: 'https://arxiv.org/rss/cs.CV', name: 'arXiv cs.CV' },
  { url: 'https://arxiv.org/rss/stat.ML', name: 'arXiv stat.ML' },
  { url: 'https://arxiv.org/rss/cs.RO', name: 'arXiv cs.RO' },
  { url: 'https://arxiv.org/rss/cs.HC', name: 'arXiv cs.HC' },
  { url: 'https://arxiv.org/rss/cs.CR', name: 'arXiv cs.CR' },
  { url: 'https://arxiv.org/rss/cs.CL', name: 'arXiv cs.CL' },
  { url: 'https://arxiv.org/rss/cs.AI', name: 'arXiv cs.AI' },
  { url: 'https://arxiv.org/rss/cs.LG', name: 'arXiv cs.LG' },

  // Tech news - high yield
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch AI' },
  { url: 'https://www.theregister.com/software/ai_ml/headlines.atom', name: 'The Register AI' },
  { url: 'https://www.nature.com/natmachintell.rss', name: 'Nature ML' },
  { url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss', name: 'IEEE Spectrum AI' },
  { url: 'https://www.wired.com/feed/tag/ai/latest/rss', name: 'Wired AI' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', name: 'The Verge AI' },
  { url: 'https://www.technologyreview.com/feed/', name: 'MIT Tech Review' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica Tech' },

  // Investigative / Policy - quality
  { url: 'https://www.eff.org/rss/updates.xml', name: 'EFF Deeplinks' },
  { url: 'https://themarkup.org/feeds/rss.xml', name: 'The Markup' },
  { url: 'https://404media.co/rss/', name: '404 Media' },
  { url: 'https://restofworld.org/feed/latest/', name: 'Rest of World' },
  { url: 'https://algorithmwatch.org/en/feed/', name: 'AlgorithmWatch' },
  { url: 'https://www.schneier.com/feed/', name: 'Schneier on Security' },
  { url: 'https://krebsonsecurity.com/feed/', name: 'Krebs on Security' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
  { url: 'https://www.theguardian.com/technology/rss', name: 'Guardian Tech' },

  // Enterprise / Industry
  { url: 'https://diginomica.com/feed', name: 'Diginomica' },
  { url: 'https://news.sap.com/feed/', name: 'SAP News' },
  { url: 'https://siliconangle.com/category/ai/feed/', name: 'SiliconAngle AI' },
  { url: 'https://www.enterpriseai.news/feed/', name: 'Enterprise AI' },
  { url: 'https://venturebeat.com/category/ai/feed/', name: 'VentureBeat AI' },

  // Robotics
  { url: 'https://www.therobotreport.com/feed/', name: 'Robot Report' },
  { url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss', name: 'IEEE Robotics' },

  // Research / Deep
  { url: 'https://bair.berkeley.edu/blog/feed.xml', name: 'BAIR Blog' },
  { url: 'https://www.marktechpost.com/feed/', name: 'MarkTechPost' },
  { url: 'https://syncedreview.com/feed/', name: 'Synced Review' },

  // Substacks - quality commentary
  { url: 'https://www.oneusefulthing.org/feed', name: 'One Useful Thing' },
  { url: 'https://garymarcus.substack.com/feed', name: 'Gary Marcus' },
  { url: 'https://www.aisnakeoil.com/feed', name: 'AI Snake Oil' },
  { url: 'https://importai.substack.com/feed', name: 'Import AI' },

  // Healthcare AI
  { url: 'https://healthitanalytics.com/feed', name: 'Health IT Analytics' },
  { url: 'https://www.mobihealthnews.com/feed', name: 'MobiHealth News' },

  // HackerNews
  { url: 'https://news.ycombinator.com/rss', name: 'Hacker News' },

  // Additional high-value
  { url: 'https://www.propublica.org/feeds/propublica/main', name: 'ProPublica' },
  { url: 'https://epic.org/feed/', name: 'EPIC' },
  { url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', name: 'ZDNet AI' },
  { url: 'https://thenextweb.com/feed/', name: 'TNW' },
  { url: 'https://www.cnet.com/rss/news/', name: 'CNET' },
  { url: 'https://gizmodo.com/rss', name: 'Gizmodo' },
  { url: 'https://www.engadget.com/rss.xml', name: 'Engadget' },
];

// Scoring
const AI_TERMS = ["ai","artificial intelligence","machine learning","algorithm","facial recognition","llm","large language model","chatbot","neural","deep learning","gpt","claude","gemini","computer vision","biometric","deepfake","autonomous","predictive","generative","copilot","agent","robot"];
const DEPLOY_TERMS = ["deploy","launch","use","using","adopt","implement","pilot","ban","lawsuit","monitor","surveil","track","scan","rollout","integrate","release"];
const HARM_TERMS = ["privacy","surveillance","bias","discrimination","harm","abuse","exploit","breach","misinformation","scam","fraud","layoff","replace","automate","job loss"];
const PROMOTE_THRESHOLD = 5;

function score(text) {
  const t = text.toLowerCase();
  let s = 0;
  for (const w of AI_TERMS) if (t.includes(w)) s += 2;
  for (const w of DEPLOY_TERMS) if (t.includes(w)) s += 1;
  for (const w of HARM_TERMS) if (t.includes(w)) s += 1;
  return s;
}

async function sb(path, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': options.prefer || 'return=minimal',
          ...options.headers
        }
      });
      if (!res.ok && res.status !== 409) throw new Error(`Supabase ${res.status}`);
      if (options.method === 'POST' || options.method === 'PATCH') return null;
      return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Fetch with browser - handles JS-rendered pages
async function fetchWithBrowser(browser, url, timeout = 15000) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36');
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    return await page.content();
  } finally {
    await page.close();
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOgImage(html) {
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return m ? m[1] : null;
}

// === RSS Discovery ===
async function discoverFromRSS(browser) {
  let totalNew = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const html = await fetchWithBrowser(browser, feed.url, 10000);

      // Parse RSS/Atom
      const items = html.match(/<item>[\s\S]*?<\/item>|<entry>[\s\S]*?<\/entry>/gi) || [];

      for (const item of items.slice(0, 30)) {
        const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href="([^"]+)"/i);

        const title = titleMatch?.[1]?.trim().replace(/<[^>]+>/g, '') || '';
        const url = linkMatch?.[1]?.trim() || linkMatch?.[2]?.trim() || '';

        if (url && url.startsWith('http')) {
          try {
            await sb('prospects', {
              method: 'POST',
              headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
              body: JSON.stringify({
                url,
                title: title.slice(0, 300),
                source_name: feed.name,
                status: 'found'
              })
            });
            totalNew++;
          } catch {}
        }
      }
      process.stdout.write('.');
    } catch {
      process.stdout.write('x');
    }
  }

  return totalNew;
}

// === Article Fetching ===
async function fetchArticle(browser, prospect) {
  const { id, url, title } = prospect;
  try {
    const html = await fetchWithBrowser(browser, url);
    const text = stripHtml(html).slice(0, 20000);
    if (text.length < 500) throw new Error('too little text');

    const s = score(`${title} ${text.slice(0, 4000)}`);
    const status = s >= PROMOTE_THRESHOLD ? 'promoted' : 'rejected';
    const ogImage = extractOgImage(html);

    // Sanitize text
    const sanitize = (str) => str ? str.replace(/[\x00-\x1F\x7F]/g, ' ') : null;

    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        score: s,
        raw_text: status === 'promoted' ? sanitize(text) : null,
        og_image: sanitize(ogImage),
      })
    });
    return { status, score: s };
  } catch (e) {
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'error', error: e.message?.slice(0, 300) })
    });
    return { status: 'error' };
  }
}

// === Fetch Batch ===
async function fetchBatch(browser, stats) {
  const batch = await sb('prospects?status=eq.found&select=id,url,title&order=discovered_at&limit=50');
  if (!batch || batch.length === 0) return 0;

  let promoted = 0;
  process.stdout.write(`[fetch ${batch.length}] `);

  for (const p of batch) {
    const result = await fetchArticle(browser, p);
    stats.fetched++;
    if (result.status === 'promoted') {
      stats.promoted++;
      promoted++;
      process.stdout.write('✓');
    } else if (result.status === 'rejected') {
      process.stdout.write('-');
    } else {
      process.stdout.write('x');
    }
  }
  console.log(` → ${promoted} promoted`);
  return promoted;
}

// === Main Loop ===
async function main() {
  while (true) {
    let browser;
    try {
      console.log('\n=== Jetson Crawler v5 (Optimized) ===');
      console.log(`Feeds: ${RSS_FEEDS.length}`);
      console.log(`Started: ${new Date().toISOString()}\n`);

      browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
      });
      console.log('Browser ready.\n');

      let stats = { discovered: 0, fetched: 0, promoted: 0 };
      let cycle = 0;

      while (true) {
        cycle++;
        const time = () => new Date().toLocaleTimeString();
        console.log(`[${time()}] === Cycle ${cycle} ===`);

        // Fetch any existing queue first
        await fetchBatch(browser, stats);

        // RSS Discovery (in chunks of 15, fetch between)
        process.stdout.write(`[${time()}] RSS: `);
        let rssNew = 0;
        for (let i = 0; i < RSS_FEEDS.length; i += 15) {
          const chunk = RSS_FEEDS.slice(i, i + 15);
          for (const feed of chunk) {
            try {
              const html = await fetchWithBrowser(browser, feed.url, 10000);
              const items = html.match(/<item>[\s\S]*?<\/item>|<entry>[\s\S]*?<\/entry>/gi) || [];
              let feedNew = 0;

              for (const item of items.slice(0, 30)) {
                const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
                const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href="([^"]+)"/i);
                const title = titleMatch?.[1]?.trim().replace(/<[^>]+>/g, '') || '';
                const url = linkMatch?.[1]?.trim() || linkMatch?.[2]?.trim() || '';

                if (url && url.startsWith('http')) {
                  try {
                    await sb('prospects', {
                      method: 'POST',
                      headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
                      body: JSON.stringify({ url, title: title.slice(0, 300), source_name: feed.name, status: 'found' })
                    });
                    feedNew++;
                  } catch {}
                }
              }
              rssNew += feedNew;
              process.stdout.write(feedNew > 0 ? `[${feedNew}]` : '.');
            } catch {
              process.stdout.write('x');
            }
          }

          // Fetch after each chunk
          console.log('');
          await fetchBatch(browser, stats);
          if (i + 15 < RSS_FEEDS.length) process.stdout.write(`[${time()}] RSS: `);
        }

        stats.discovered += rssNew;

        // Archive crawl on cycle 1 (the deep stuff)
        if (cycle === 1) {
          await crawlArchives(browser, stats);
        }

        console.log(`[${time()}] Cycle ${cycle} complete: discovered=${stats.discovered} fetched=${stats.fetched} promoted=${stats.promoted}\n`);

        // Brief pause
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (e) {
      console.log(`\n!!! Crash: ${e.message?.slice(0, 100)}`);
      console.log('Restarting in 10s...\n');
      try { await browser?.close(); } catch {}
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

// === ARCHIVE CRAWLING - THE DEEP STUFF ===
const ARCHIVES = [
  // TechCrunch - paginated archives
  { name: 'TechCrunch AI', base: 'https://techcrunch.com/category/artificial-intelligence/page/', pages: 100 },
  { name: 'TechCrunch Robotics', base: 'https://techcrunch.com/category/robotics/page/', pages: 50 },
  
  // Wired
  { name: 'Wired AI', base: 'https://www.wired.com/tag/artificial-intelligence/page/', pages: 100 },
  { name: 'Wired ML', base: 'https://www.wired.com/tag/machine-learning/page/', pages: 50 },
  
  // Ars Technica
  { name: 'Ars AI', base: 'https://arstechnica.com/ai/page/', pages: 50 },
  
  // The Verge
  { name: 'Verge AI', base: 'https://www.theverge.com/ai-artificial-intelligence/archives/', pages: 50 },
  
  // MIT Tech Review
  { name: 'MIT TR AI', base: 'https://www.technologyreview.com/topic/artificial-intelligence/page/', pages: 100 },
  
  // The Markup - full archive
  { name: 'The Markup', base: 'https://themarkup.org/series/machine-learning/page/', pages: 20 },
  
  // 404 Media
  { name: '404 Media', base: 'https://www.404media.co/tag/ai/page/', pages: 30 },
  
  // Rest of World
  { name: 'Rest of World', base: 'https://restofworld.org/series/ai/page/', pages: 20 },
  
  // IEEE Spectrum
  { name: 'IEEE AI', base: 'https://spectrum.ieee.org/topic/artificial-intelligence/page/', pages: 50 },
  { name: 'IEEE Robotics', base: 'https://spectrum.ieee.org/topic/robotics/page/', pages: 50 },
  
  // VentureBeat
  { name: 'VentureBeat AI', base: 'https://venturebeat.com/category/ai/page/', pages: 100 },
  
  // ZDNet
  { name: 'ZDNet AI', base: 'https://www.zdnet.com/topic/artificial-intelligence/page/', pages: 50 },
];

async function crawlArchives(browser, stats) {
  console.log('\n=== ARCHIVE CRAWL ===');
  
  for (const archive of ARCHIVES) {
    process.stdout.write(`${archive.name}: `);
    let archiveNew = 0;
    let emptyPages = 0;
    
    for (let page = 1; page <= archive.pages; page++) {
      try {
        const url = archive.base + page + '/';
        const html = await fetchWithBrowser(browser, url, 20000);
        
        // Extract article links - common patterns
        const links = [];
        const patterns = [
          /<a[^>]*href="(https?:\/\/[^"]+\/\d{4}\/\d{2}\/[^"]+)"[^>]*>/gi,  // dated URLs
          /<h[23][^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>/gi,  // headings with links
          /<article[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>/gi,  // article tags
        ];
        
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(html)) !== null) {
            if (match[1] && match[1].startsWith('http') && !match[1].includes('/tag/') && !match[1].includes('/category/') && !match[1].includes('/page/')) {
              links.push(match[1]);
            }
          }
        }
        
        // Dedupe
        const unique = [...new Set(links)];
        
        if (unique.length === 0) {
          emptyPages++;
          if (emptyPages >= 3) break;  // Stop if 3 empty pages in a row
          process.stdout.write('.');
          continue;
        }
        
        emptyPages = 0;
        let pageNew = 0;
        
        for (const link of unique) {
          try {
            await sb('prospects', {
              method: 'POST',
              headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
              body: JSON.stringify({ url: link, title: '', source_name: archive.name, status: 'found' })
            });
            pageNew++;
            archiveNew++;
          } catch {}
        }
        
        process.stdout.write(pageNew > 0 ? `[${pageNew}]` : '.');
        stats.discovered += pageNew;
        
        // Fetch every 5 pages
        if (page % 5 === 0 && archiveNew > 0) {
          console.log('');
          await fetchBatch(browser, stats);
          process.stdout.write(`${archive.name} p${page}: `);
        }
        
        await new Promise(r => setTimeout(r, 1000));  // Be nice
      } catch {
        process.stdout.write('x');
      }
    }
    
    console.log(` → ${archiveNew} new`);
  }
}

main();
