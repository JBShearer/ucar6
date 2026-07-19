#!/usr/bin/env node
// Jetson Browser Crawler v4 for UCAR
// Deep crawling with pagination, archives, and multiple APIs

import puppeteer from 'puppeteer-core';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = '__PURGED_SUPABASE_KEY__';

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

// === RSS FEEDS (same as v3) ===
const RSS_FEEDS = [
  // General Tech / AI
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.wired.com/feed/tag/ai/latest/rss',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
  'https://venturebeat.com/category/ai/feed/',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.technologyreview.com/feed/',
  'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
  'https://www.engadget.com/rss.xml',
  'https://thenextweb.com/feed/',
  'https://news.ycombinator.com/rss',
  'https://www.blog.google/rss/',
  'https://blog.google/technology/ai/rss',

  // Medium / Substack
  'https://medium.com/feed/tag/artificial-intelligence',
  'https://medium.com/feed/tag/machine-learning',
  'https://medium.com/feed/towards-data-science',
  'https://towardsdatascience.com/feed',
  'https://www.oneusefulthing.org/feed',
  'https://garymarcus.substack.com/feed',
  'https://importai.substack.com/feed',
  'https://thezvi.substack.com/feed',
  'https://www.aisnakeoil.com/feed',
  'https://bensbites.beehiiv.com/feed',

  // Investigative / Policy
  'https://themarkup.org/feeds/rss.xml',
  'https://www.eff.org/rss/updates.xml',
  'https://www.propublica.org/feeds/propublica/main',
  'https://404media.co/rss/',
  'https://algorithmwatch.org/en/feed/',
  'https://restofworld.org/feed/latest/',
  'https://epic.org/feed/',
  'https://cset.georgetown.edu/feed/',

  // Enterprise
  'https://news.sap.com/feed/',
  'https://diginomica.com/feed',
  'https://siliconangle.com/category/ai/feed/',
  'https://www.enterpriseai.news/feed/',
  'https://www.datanami.com/feed/',
  'https://aws.amazon.com/blogs/machine-learning/feed/',

  // Science / Research
  'https://www.nature.com/natmachintell.rss',
  'https://arxiv.org/rss/cs.AI',
  'https://arxiv.org/rss/cs.LG',
  'https://bair.berkeley.edu/blog/feed.xml',
  'https://www.marktechpost.com/feed/',

  // Robotics
  'https://www.therobotreport.com/feed/',
  'https://robohub.org/feed/',
  'https://spectrum.ieee.org/feeds/topic/robotics.rss',

  // Healthcare AI
  'https://healthitanalytics.com/feed',
  'https://www.healthcareitnews.com/feed',
  'https://www.mobihealthnews.com/feed',
];

// === GOOGLE NEWS QUERIES (with pagination) ===
const GOOGLE_NEWS_QUERIES = [
  // Core AI
  'artificial+intelligence+deployment',
  'AI+system+launched',
  'machine+learning+production',
  'ChatGPT+uses',
  'GPT-4+application',
  'Claude+AI+uses',
  'generative+AI+company',

  // Harms / Surveillance
  'AI+bias+discrimination',
  'facial+recognition+surveillance',
  'AI+privacy+violation',
  'deepfake+fraud+scam',
  'AI+misinformation',

  // Industry verticals
  'AI+healthcare+diagnosis',
  'AI+hiring+recruitment',
  'AI+finance+trading',
  'AI+education+grading',
  'AI+military+weapon',
  'AI+police+predictive',
  'AI+insurance+claims',
  'autonomous+vehicle+crash',

  // Legal / Labor
  'AI+lawsuit+sued',
  'AI+copyright+artists',
  'AI+job+replaced+layoff',
  'AI+worker+automation',

  // Robotics
  'robot+AI+warehouse',
  'humanoid+robot+deployment',
  'AI+drone+autonomous',
];

// === HACKERNEWS API ===
async function fetchHackerNews() {
  const discovered = [];
  try {
    // Get top, new, and best stories
    const endpoints = [
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      'https://hacker-news.firebaseio.com/v0/newstories.json',
      'https://hacker-news.firebaseio.com/v0/beststories.json',
    ];

    for (const endpoint of endpoints) {
      const res = await fetch(endpoint);
      const ids = await res.json();

      // Get first 100 from each
      for (const id of ids.slice(0, 100)) {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const item = await itemRes.json();

          if (!item?.url || !item?.title) continue;

          // Filter for AI-related content
          const text = `${item.title} ${item.url}`.toLowerCase();
          const aiKeywords = ['ai', 'artificial', 'machine learning', 'ml', 'neural', 'gpt', 'llm',
            'chatbot', 'deepfake', 'facial recognition', 'autonomous', 'robot', 'algorithm',
            'openai', 'anthropic', 'google ai', 'meta ai', 'diffusion', 'transformer'];

          if (aiKeywords.some(kw => text.includes(kw))) {
            discovered.push({
              url: item.url,
              title: item.title.slice(0, 300),
              source_name: 'HackerNews',
              score: item.score || 0,
            });
          }
        } catch (e) { /* skip bad items */ }

        // Rate limit
        if (discovered.length % 10 === 0) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
  } catch (e) {
    console.log(`HN error: ${e.message?.slice(0, 50)}`);
  }
  return discovered;
}

// === REDDIT JSON API ===
async function fetchReddit() {
  const discovered = [];
  const subreddits = [
    'MachineLearning',
    'artificial',
    'ArtificialIntelligence',
    'singularity',
    'LocalLLaMA',
    'ChatGPT',
    'OpenAI',
    'StableDiffusion',
    'robotics',
    'technology',
    'Futurology',
    'AIethics',
  ];

  for (const sub of subreddits) {
    try {
      // Get hot, new, and top posts
      for (const sort of ['hot', 'new', 'top']) {
        const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=50&t=week`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'UCAR-Crawler/1.0' }
        });

        if (!res.ok) continue;
        const data = await res.json();

        for (const post of data?.data?.children || []) {
          const p = post.data;
          // Only external links, not self posts
          if (!p.url || p.is_self || p.url.includes('reddit.com')) continue;

          discovered.push({
            url: p.url,
            title: p.title?.slice(0, 300) || '',
            source_name: `Reddit r/${sub}`,
            score: p.score || 0,
          });
        }

        await new Promise(r => setTimeout(r, 500)); // Rate limit
      }
    } catch (e) {
      console.log(`Reddit r/${sub} error: ${e.message?.slice(0, 30)}`);
    }
  }
  return discovered;
}

// === SITE ARCHIVES / SITEMAPS ===
const ARCHIVE_SITES = [
  // TechCrunch AI archive
  {
    name: 'TechCrunch AI Archive',
    type: 'paginated',
    baseUrl: 'https://techcrunch.com/category/artificial-intelligence/page/',
    maxPages: 20,
  },
  // Wired AI archive
  {
    name: 'Wired AI Archive',
    type: 'paginated',
    baseUrl: 'https://www.wired.com/tag/artificial-intelligence/page/',
    maxPages: 20,
  },
  // Ars Technica
  {
    name: 'Ars AI Archive',
    type: 'paginated',
    baseUrl: 'https://arstechnica.com/ai/page/',
    maxPages: 20,
  },
  // The Verge
  {
    name: 'Verge AI Archive',
    type: 'paginated',
    baseUrl: 'https://www.theverge.com/ai-artificial-intelligence/archives/',
    maxPages: 20,
  },
  // MIT Tech Review
  {
    name: 'MIT TR Archive',
    type: 'paginated',
    baseUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/page/',
    maxPages: 20,
  },
  // 404 Media
  {
    name: '404 Media Archive',
    type: 'paginated',
    baseUrl: 'https://www.404media.co/tag/ai/page/',
    maxPages: 10,
  },
  // The Markup
  {
    name: 'Markup Archive',
    type: 'sitemap',
    sitemapUrl: 'https://themarkup.org/sitemap.xml',
  },
];

// === HELPER FUNCTIONS ===
async function sb(path, options = {}) {
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
  if (!res.ok && res.status !== 409) {
    throw new Error(`Supabase ${res.status}`);
  }
  if (options.method === 'POST' || options.method === 'PATCH') return null;
  return res.json();
}

async function insertProspect(item) {
  try {
    await sb('prospects', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        url: item.url,
        title: item.title?.slice(0, 300) || '',
        source_name: item.source_name || 'unknown',
        status: 'found'
      })
    });
    return true;
  } catch (e) {
    return false; // duplicate
  }
}

// === GOOGLE NEWS WITH PAGINATION ===
async function scrapeGoogleNewsPaginated(browser, query, maxPages = 5) {
  let discovered = 0;
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const start = pageNum * 10;
      const url = `https://news.google.com/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

      // Google News doesn't use traditional pagination, but we can scroll
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Scroll to load more content
      for (let i = 0; i < pageNum + 1; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 2000));
      }

      const links = await page.evaluate(() => {
        const articles = [];
        document.querySelectorAll('a[href*="/read/"], article a[href*="./articles/"]').forEach(a => {
          const title = a.textContent?.trim();
          let href = a.href;
          if (href.startsWith('./')) {
            href = 'https://news.google.com' + href.slice(1);
          }
          if (title && title.length > 15 && href) {
            articles.push({ title: title.slice(0, 200), url: href });
          }
        });
        return articles;
      });

      for (const item of links) {
        if (await insertProspect({ ...item, source_name: `GNews: ${query}` })) {
          discovered++;
        }
      }

      // Don't hammer Google
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) {
    // Ignore errors, just continue
  } finally {
    await page.close();
  }
  return discovered;
}

// === ARCHIVE CRAWLING ===
async function crawlArchive(browser, site) {
  let discovered = 0;
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');

    if (site.type === 'paginated') {
      for (let pageNum = 1; pageNum <= site.maxPages; pageNum++) {
        const url = site.baseUrl + pageNum + '/';

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch (e) {
          break; // No more pages
        }

        const links = await page.evaluate(() => {
          const articles = [];
          // Common article link patterns
          document.querySelectorAll('article a, h2 a, h3 a, .post-title a, .entry-title a').forEach(a => {
            const title = a.textContent?.trim();
            const href = a.href;
            if (title && title.length > 10 && href && href.startsWith('http')) {
              articles.push({ title: title.slice(0, 200), url: href });
            }
          });
          return articles;
        });

        if (links.length === 0) break; // Empty page, stop

        for (const item of links) {
          if (await insertProspect({ ...item, source_name: site.name })) {
            discovered++;
          }
        }

        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 1000));
      }
    } else if (site.type === 'sitemap') {
      try {
        const res = await fetch(site.sitemapUrl);
        const xml = await res.text();

        // Simple XML URL extraction
        const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
        for (const match of urlMatches.slice(0, 500)) {
          const url = match.replace('<loc>', '').replace('</loc>', '');
          if (url.includes('/article') || url.includes('/story') || url.includes('/news')) {
            if (await insertProspect({ url, title: '', source_name: site.name })) {
              discovered++;
            }
          }
        }
      } catch (e) {
        // Sitemap fetch failed
      }
    }
  } catch (e) {
    console.log(`Archive error ${site.name}: ${e.message?.slice(0, 30)}`);
  } finally {
    await page.close();
  }

  return discovered;
}

// === RSS FEED FETCHING (via Puppeteer for JS-rendered feeds) ===
async function fetchRSSFeed(browser, feedUrl) {
  let discovered = 0;
  const page = await browser.newPage();

  try {
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(feedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const content = await page.content();

    // Parse RSS/Atom items
    const itemRegex = /<item>[\s\S]*?<\/item>|<entry>[\s\S]*?<\/entry>/gi;
    const items = content.match(itemRegex) || [];

    for (const item of items.slice(0, 30)) {
      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href="([^"]+)"/i);

      const title = titleMatch?.[1]?.trim() || '';
      const url = linkMatch?.[1]?.trim() || linkMatch?.[2]?.trim() || '';

      if (url && url.startsWith('http')) {
        if (await insertProspect({ url, title, source_name: feedUrl.split('/')[2] })) {
          discovered++;
        }
      }
    }
  } catch (e) {
    // Feed error, continue
  } finally {
    await page.close();
  }

  return discovered;
}

// === ARTICLE FETCHING ===
async function fetchArticle(browser, prospect) {
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

    await page.goto(prospect.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Get text content
    const data = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
      const getMeta = (name) => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content || '';

      // Remove scripts, nav, footer
      document.querySelectorAll('script, style, nav, footer, header, aside, .ad, .advertisement').forEach(el => el.remove());

      const article = document.querySelector('article') || document.querySelector('main') || document.body;
      const text = article?.innerText || '';

      return {
        title: getText('h1') || document.title,
        text: text.slice(0, 15000),
        og_image: getMeta('og:image'),
        published: getMeta('article:published_time') || getMeta('datePublished'),
      };
    });

    // Check if AI-related
    const fullText = `${data.title} ${data.text}`.toLowerCase();
    const aiKeywords = ['artificial intelligence', 'machine learning', 'ai ', ' ai,', 'neural network',
      'deep learning', 'chatgpt', 'gpt-4', 'gpt-5', 'llm', 'large language model', 'chatbot',
      'facial recognition', 'deepfake', 'autonomous', 'algorithm', 'robot', 'automation',
      'openai', 'anthropic', 'google ai', 'meta ai', 'midjourney', 'stable diffusion', 'dall-e',
      'computer vision', 'nlp', 'natural language', 'predictive', 'recommendation'];

    const isAI = aiKeywords.some(kw => fullText.includes(kw));

    if (isAI && data.text.length > 500) {
      await sb(`prospects?id=eq.${prospect.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'promoted',
          raw_text: data.text.slice(0, 50000),
          og_image: data.og_image || null,
          published_at: data.published || null,
        })
      });
      return { status: 'promoted' };
    } else {
      await sb(`prospects?id=eq.${prospect.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' })
      });
      return { status: 'rejected' };
    }
  } catch (e) {
    await sb(`prospects?id=eq.${prospect.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'error', error: e.message?.slice(0, 200) })
    });
    return { status: 'error' };
  } finally {
    await page.close();
  }
}

// === RELATED LINKS EXTRACTION (snowball) ===
async function extractRelatedLinks(browser, articleUrl) {
  const discovered = [];
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const links = await page.evaluate(() => {
      const related = [];
      // Look for "related articles", "see also", "more stories" sections
      const selectors = [
        '.related-articles a', '.related a', '.see-also a', '.more-stories a',
        '[class*="related"] a', '[class*="recommended"] a', 'aside article a',
      ];

      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(a => {
          if (a.href && a.href.startsWith('http') && a.textContent?.length > 10) {
            related.push({ url: a.href, title: a.textContent.trim().slice(0, 200) });
          }
        });
      });

      return related.slice(0, 10);
    });

    for (const link of links) {
      discovered.push({ ...link, source_name: 'Related: ' + new URL(articleUrl).hostname });
    }
  } catch (e) {
    // Ignore
  } finally {
    await page.close();
  }

  return discovered;
}

// === MAIN LOOP ===
async function main() {
  console.log('=== Jetson Browser Crawler v4 ===');
  console.log(`Chromium: ${CHROMIUM_PATH}`);
  console.log(`RSS Feeds: ${RSS_FEEDS.length}`);
  console.log(`Google News Queries: ${GOOGLE_NEWS_QUERIES.length}`);
  console.log(`Archive Sites: ${ARCHIVE_SITES.length}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  console.log('Browser ready.\n');

  let stats = { discovered: 0, fetched: 0, promoted: 0 };
  let cycle = 0;

  try {
    while (true) {
      cycle++;
      const time = () => new Date().toLocaleTimeString();

      // === PHASE 1: API Sources (no browser needed) ===
      console.log(`[${time()}] === Cycle ${cycle} ===`);

      // HackerNews
      process.stdout.write(`[${time()}] HackerNews: `);
      const hnItems = await fetchHackerNews();
      let hnNew = 0;
      for (const item of hnItems) {
        if (await insertProspect(item)) hnNew++;
      }
      console.log(`${hnNew} new (${hnItems.length} checked)`);
      stats.discovered += hnNew;

      // Reddit
      process.stdout.write(`[${time()}] Reddit: `);
      const redditItems = await fetchReddit();
      let redditNew = 0;
      for (const item of redditItems) {
        if (await insertProspect(item)) redditNew++;
      }
      console.log(`${redditNew} new (${redditItems.length} checked)`);
      stats.discovered += redditNew;

      // === PHASE 2: RSS Feeds ===
      process.stdout.write(`[${time()}] RSS Feeds: `);
      let rssNew = 0;
      for (const feed of RSS_FEEDS) {
        const found = await fetchRSSFeed(browser, feed);
        rssNew += found;
        process.stdout.write(found > 0 ? `[${found}]` : '.');
      }
      console.log(` → ${rssNew} new`);
      stats.discovered += rssNew;

      // === PHASE 3: Google News (paginated) ===
      process.stdout.write(`[${time()}] Google News: `);
      let gnewsNew = 0;
      for (const query of GOOGLE_NEWS_QUERIES) {
        const found = await scrapeGoogleNewsPaginated(browser, query, 3);
        gnewsNew += found;
        process.stdout.write(found > 0 ? `[${found}]` : '.');
      }
      console.log(` → ${gnewsNew} new`);
      stats.discovered += gnewsNew;

      // === PHASE 4: Archives (every 5 cycles) ===
      if (cycle % 5 === 1) {
        console.log(`[${time()}] Archive crawl...`);
        for (const site of ARCHIVE_SITES) {
          process.stdout.write(`  ${site.name}: `);
          const found = await crawlArchive(browser, site);
          console.log(` ${found} new`);
          stats.discovered += found;
        }
      }

      // === PHASE 5: Fetch & Promote Articles ===
      const batch = await sb('prospects?status=eq.found&select=id,url,title&order=discovered_at&limit=50');
      if (batch && batch.length > 0) {
        process.stdout.write(`[${time()}] Fetching ${batch.length} articles: `);
        for (const p of batch) {
          const result = await fetchArticle(browser, p);
          stats.fetched++;
          if (result.status === 'promoted') {
            stats.promoted++;
            process.stdout.write('✓');

            // Snowball: extract related links from promoted articles
            const related = await extractRelatedLinks(browser, p.url);
            for (const r of related) {
              await insertProspect(r);
            }
          } else if (result.status === 'rejected') {
            process.stdout.write('-');
          } else {
            process.stdout.write('x');
          }
        }
        console.log('');
      }

      console.log(`  ═══ discovered=${stats.discovered} fetched=${stats.fetched} promoted=${stats.promoted} ═══\n`);

      // Brief pause between cycles
      await new Promise(r => setTimeout(r, 10000));
    }
  } catch (e) {
    console.log(`Fatal: ${e.stack}`);
  } finally {
    await browser.close();
  }
}

main();
