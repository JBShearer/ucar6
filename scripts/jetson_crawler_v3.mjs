
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Jetson Browser Crawler for UCAR
// Full Puppeteer-based crawling for RSS and articles

import puppeteer from 'puppeteer-core';

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

const RSS_FEEDS = [
  // === GENERAL TECH / AI NEWS ===
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.wired.com/feed/tag/ai/latest/rss',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
  'https://venturebeat.com/category/ai/feed/',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.technologyreview.com/feed/',
  'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
  'https://www.cnet.com/rss/news/',
  'https://gizmodo.com/rss',
  'https://www.engadget.com/rss.xml',
  'https://thenextweb.com/feed/',
  'https://mashable.com/feeds/rss/all',
  'https://readwrite.com/feed/',
  'http://feeds.feedburner.com/TechCrunch',
  'https://news.ycombinator.com/rss',
  'http://rss.slashdot.org/Slashdot/slashdotMain',
  'https://www.blog.google/rss/',
  'https://blog.google/technology/ai/rss',
  'https://blog.google/products/search/rss',

  // === MEDIUM / SUBSTACK AI ===
  'https://medium.com/feed/tag/artificial-intelligence',
  'https://medium.com/feed/tag/machine-learning',
  'https://medium.com/feed/towards-data-science',
  'https://towardsdatascience.com/feed',
  'https://www.oneusefulthing.org/feed',
  'https://garymarcus.substack.com/feed',
  'https://www.astralcodexten.com/feed',
  'https://thealgorithmicbridge.substack.com/feed',
  'https://importai.substack.com/feed',
  'https://thezvi.substack.com/feed',
  'https://www.aisnakeoil.com/feed',
  'https://bensbites.beehiiv.com/feed',
  'https://www.superhuman.ai/feed',

  // === INVESTIGATIVE / POLICY ===
  'https://themarkup.org/feeds/rss.xml',
  'https://www.eff.org/rss/updates.xml',
  'https://www.propublica.org/feeds/propublica/main',
  'https://404media.co/rss/',
  'https://algorithmwatch.org/en/feed/',
  'https://restofworld.org/feed/latest/',
  'https://www.brookings.edu/topic/artificial-intelligence/feed/',
  'https://www.brennancenter.org/rss/all',
  'https://epic.org/feed/',
  'https://www.accessnow.org/feed/',
  'https://cset.georgetown.edu/feed/',

  // === SAP & ENTERPRISE ===
  'https://news.sap.com/feed/',
  'https://diginomica.com/feed',
  'https://www.cio.com/news/feed/',
  'https://www.infoworld.com/news/feed/',
  'https://www.computerworld.com/news/feed/',
  'https://www.informationweek.com/rss.xml',
  'https://siliconangle.com/feed/',
  'https://siliconangle.com/category/ai/feed/',
  'https://www.ciodive.com/feeds/news/',
  'https://www.enterpriseai.news/feed/',
  'https://www.itprotoday.com/rss.xml',
  'https://www.datanami.com/feed/',
  'https://aws.amazon.com/blogs/machine-learning/feed/',
  'https://aws.amazon.com/blogs/aws/feed/',
  'https://azure.microsoft.com/en-us/blog/feed/',
  'https://constellation-research.com/feed',

  // === SCIENCE & RESEARCH ===
  'https://www.nature.com/subjects/machine-learning.rss',
  'https://www.nature.com/subjects/computer-science.rss',
  'https://www.nature.com/natmachintell.rss',
  'https://www.science.org/rss/news_current.xml',
  'https://phys.org/rss-feed/breaking/physics-news/artificial-intelligence/',
  'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
  'https://arxiv.org/rss/cs.AI',
  'https://arxiv.org/rss/cs.LG',
  'https://arxiv.org/rss/cs.CL',
  'https://arxiv.org/rss/cs.CV',
  'https://arxiv.org/rss/cs.NE',
  'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  'https://www.newscientist.com/subject/technology/feed/',
  'https://www.quantamagazine.org/feed/',
  'https://bair.berkeley.edu/blog/feed.xml',
  'https://syncedreview.com/feed/',
  'https://www.marktechpost.com/feed/',
  'https://www.kdnuggets.com/feed',
  'https://machinelearningmastery.com/feed/',

  // === HEALTHCARE AI ===
  'https://healthitanalytics.com/feed',
  'https://www.fiercehealthcare.com/rss/xml',
  'https://www.mobihealthnews.com/feed',
  'https://www.statnews.com/feed/',
  'https://hitconsultant.net/feed/',
  'https://www.thelancet.com/rssfeed/lancet_current.xml',
  'https://jamanetwork.com/rss/site_3/67.xml',

  // === BIOTECH ===
  'https://www.genengnews.com/feed/',
  'https://www.fiercebiotech.com/rss/xml',
  'https://www.biopharmadive.com/feeds/news/',

  // === FINANCE / FINTECH ===
  'https://www.finextra.com/rss/headlines.aspx',
  'https://www.pymnts.com/feed/',
  'https://www.bankingdive.com/feeds/news/',

  // === SECURITY ===
  'https://krebsonsecurity.com/feed/',
  'https://www.schneier.com/feed/',
  'https://www.darkreading.com/rss.xml',
  'https://thehackernews.com/feeds/posts/default',
  'https://www.bleepingcomputer.com/feed/',
  'https://nakedsecurity.sophos.com/feed/',
  'https://www.securityweek.com/feed',

  // === GOVERNMENT / POLICY ===
  'https://www.govtech.com/rss/',
  'https://fcw.com/rss/',
  'https://www.nextgov.com/rss/all/',
  'https://www.gao.gov/rss/reports.xml',
  'https://www.ftc.gov/feeds/press-releases-consumer-protection.xml',
  'https://www.whitehouse.gov/feed/',
  'https://federalnewsnetwork.com/feed/',
  'https://www.c4isrnet.com/arc/outboundfeeds/rss/?outputType=xml',
  'https://www.nist.gov/news-events/news/rss.xml',

  // === LAW / LEGAL TECH ===
  'https://www.law.com/legaltechnews/feed/',
  'https://abovethelaw.com/feed/',
  'https://www.jdsupra.com/resources/syndication/rss/topics/artificial-intelligence/',

  // === LABOR / EMPLOYMENT ===
  'https://www.hrdive.com/feeds/news/',

  // === AI NEWSLETTERS ===
  'https://newsletter.ruder.io/feed',
  'https://lastweekin.ai/feed',
  'https://jack-clark.net/feed/',
  'https://aiweekly.co/issues.rss',
  'https://www.newcomer.co/feed',
  'https://stratechery.com/feed/',
  'https://www.platformer.news/feed',
  'https://simonwillison.net/atom/everything/',
  'https://www.lennysnewsletter.com/feed',

  // === NEWS GENERAL ===
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.theguardian.com/world/rss',
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://feeds.washingtonpost.com/rss/business/technology',
  'https://www.reuters.com/rssFeed/technologyNews',
  'https://apnews.com/apf-technology/feed',

  // === INTERNATIONAL ===
  'https://www.scmp.com/rss/91/feed',
  'https://www.scmp.com/rss/4/feed',
  'https://technode.com/feed/',
  'https://www.japantimes.co.jp/feed/topstories/',
  'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  'https://www.lemonde.fr/en/rss/une.xml',
  'https://www.dw.com/en/top-stories/s-9097/rss',
  'https://www.aljazeera.com/xml/rss/all.xml',

  // === ROBOTICS / AUTOMATION ===
  'https://www.therobotreport.com/feed/',
  'https://roboticsandautomationnews.com/feed/',
  'https://spectrum.ieee.org/feeds/topic/robotics.rss',

  // === ETHICS / PHILOSOPHY ===
  'https://www.technologyreview.com/topic/humans-and-technology/feed',
  'https://www.wired.com/feed/category/ideas/latest/rss',

  // === STARTUPS / VC ===
  'https://techcrunch.com/category/startups/feed/',
  'https://news.crunchbase.com/feed/',
  'https://a16z.com/feed/',

  // === DATA / PRIVACY ===
  'https://www.wired.com/feed/category/security/latest/rss',
  'https://iapp.org/feed/',
  'https://fpf.org/feed/',

  // === EDUCATION ===
  'https://thejournal.com/rss-feeds/all-articles.aspx',
  'https://www.insidehighered.com/rss/news/feed',

  // === RETAIL ===
  'https://www.retaildive.com/feeds/news/',
];

// Add SAP-specific terms to scoring
const SAP_TERMS = ["sap", "joule", "s/4hana", "business ai", "btp", "datasphere", "signavio"];

const AI_TERMS = ["ai","artificial intelligence","machine learning","algorithm","facial recognition","llm","large language model","chatbot","neural","deep learning","gpt","claude","gemini","computer vision","biometric","deepfake","autonomous","predictive","generative","joule","copilot","agent"];
const DEPLOY_TERMS = ["deploy","launch","use","using","adopt","implement","pilot","ban","lawsuit","monitor","surveil","track","scan","rollout","integrate"];
const HARM_TERMS = ["privacy","surveillance","bias","discrimination","harm","abuse","exploit","breach","misinformation","scam","fraud","layoff","replace","automate"];
const ENTERPRISE_TERMS = ["sap","oracle","salesforce","microsoft","google cloud","aws","enterprise","erp","crm","s/4hana","btp","datasphere","signavio","workday","servicenow"];

function score(text) {
  const t = text.toLowerCase();
  let s = 0;
  for (const w of AI_TERMS) if (t.includes(w)) s += 2;
  for (const w of DEPLOY_TERMS) if (t.includes(w)) s += 1;
  for (const w of HARM_TERMS) if (t.includes(w)) s += 1;
  for (const w of ENTERPRISE_TERMS) if (t.includes(w)) s += 2;
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

// Unescape HTML entities
function unescapeHtml(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[|\]\]>/g, '');
}

function parseFeed(content) {
  // First unescape if browser rendered it as HTML
  const xml = unescapeHtml(content);

  const items = [];
  const grab = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null;
  };

  // RSS 2.0
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const url = grab(m[0], 'link');
    const title = grab(m[0], 'title');
    if (url && title) items.push({ url: url.trim(), title: unescapeHtml(title) });
  }

  // Atom
  for (const m of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)) {
    const href = m[0].match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const title = grab(m[0], 'title');
    if (href && title) items.push({ url: href.trim(), title: unescapeHtml(title) });
  }

  return items.slice(0, 30);
}

function extractOgImage(html) {
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#\d+;|&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithBrowser(browser, url, timeout = 25000) {
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
    await new Promise(r => setTimeout(r, 2000));
    return await page.content();
  } finally {
    await page.close();
  }
}

async function discoverFromFeeds(browser) {
  let discovered = 0;

  for (const feedUrl of RSS_FEEDS) {
    try {
      const content = await fetchWithBrowser(browser, feedUrl, 20000);
      const items = parseFeed(content);

      for (const item of items) {
        if (!item.url || !item.url.startsWith('http')) continue;
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
        } catch (e) { /* duplicate */ }
      }
      process.stdout.write(`[${items.length}]`);
    } catch (e) {
      process.stdout.write('[x]');
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

// Google News and other non-RSS scraping targets - EXPANDED
const SCRAPE_TARGETS = [
  // Core AI topics
  { url: 'https://news.google.com/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en', name: 'GNews AI' },
  { url: 'https://news.google.com/search?q=machine+learning&hl=en-US&gl=US&ceid=US:en', name: 'GNews ML' },
  { url: 'https://news.google.com/search?q=generative+AI&hl=en-US&gl=US&ceid=US:en', name: 'GNews GenAI' },
  { url: 'https://news.google.com/search?q=ChatGPT+OR+Claude+OR+Gemini&hl=en-US&gl=US&ceid=US:en', name: 'GNews LLMs' },
  { url: 'https://news.google.com/search?q=OpenAI+OR+Anthropic+OR+Google+AI&hl=en-US&gl=US&ceid=US:en', name: 'GNews AI Labs' },

  // Enterprise / SAP
  { url: 'https://news.google.com/search?q=SAP+AI&hl=en-US&gl=US&ceid=US:en', name: 'GNews SAP AI' },
  { url: 'https://news.google.com/search?q=SAP+Joule&hl=en-US&gl=US&ceid=US:en', name: 'GNews SAP Joule' },
  { url: 'https://news.google.com/search?q=enterprise+AI+software&hl=en-US&gl=US&ceid=US:en', name: 'GNews Enterprise' },
  { url: 'https://news.google.com/search?q=Microsoft+Copilot+enterprise&hl=en-US&gl=US&ceid=US:en', name: 'GNews Copilot' },
  { url: 'https://news.google.com/search?q=Salesforce+Einstein+AI&hl=en-US&gl=US&ceid=US:en', name: 'GNews Salesforce' },

  // Harms / Surveillance
  { url: 'https://news.google.com/search?q=AI+bias+discrimination&hl=en-US&gl=US&ceid=US:en', name: 'GNews AI Bias' },
  { url: 'https://news.google.com/search?q=facial+recognition+surveillance&hl=en-US&gl=US&ceid=US:en', name: 'GNews Surveillance' },
  { url: 'https://news.google.com/search?q=AI+privacy+violation&hl=en-US&gl=US&ceid=US:en', name: 'GNews Privacy' },
  { url: 'https://news.google.com/search?q=deepfake+fraud+scam&hl=en-US&gl=US&ceid=US:en', name: 'GNews Deepfake' },
  { url: 'https://news.google.com/search?q=AI+misinformation+disinformation&hl=en-US&gl=US&ceid=US:en', name: 'GNews Misinfo' },

  // Industry verticals
  { url: 'https://news.google.com/search?q=AI+healthcare+diagnosis+medical&hl=en-US&gl=US&ceid=US:en', name: 'GNews Healthcare' },
  { url: 'https://news.google.com/search?q=AI+hiring+recruitment+HR&hl=en-US&gl=US&ceid=US:en', name: 'GNews Hiring' },
  { url: 'https://news.google.com/search?q=AI+finance+banking+trading&hl=en-US&gl=US&ceid=US:en', name: 'GNews Finance' },
  { url: 'https://news.google.com/search?q=AI+education+school+university&hl=en-US&gl=US&ceid=US:en', name: 'GNews Education' },
  { url: 'https://news.google.com/search?q=AI+military+defense+weapon&hl=en-US&gl=US&ceid=US:en', name: 'GNews Military' },
  { url: 'https://news.google.com/search?q=AI+police+law+enforcement&hl=en-US&gl=US&ceid=US:en', name: 'GNews Police' },
  { url: 'https://news.google.com/search?q=AI+insurance+claims&hl=en-US&gl=US&ceid=US:en', name: 'GNews Insurance' },
  { url: 'https://news.google.com/search?q=AI+retail+shopping+ecommerce&hl=en-US&gl=US&ceid=US:en', name: 'GNews Retail' },

  // Legal / Regulation
  { url: 'https://news.google.com/search?q=AI+lawsuit+litigation&hl=en-US&gl=US&ceid=US:en', name: 'GNews Lawsuit' },
  { url: 'https://news.google.com/search?q=AI+copyright+intellectual+property&hl=en-US&gl=US&ceid=US:en', name: 'GNews Copyright' },
  { url: 'https://news.google.com/search?q=AI+regulation+legislation+law&hl=en-US&gl=US&ceid=US:en', name: 'GNews Regulation' },
  { url: 'https://news.google.com/search?q=EU+AI+Act&hl=en-US&gl=US&ceid=US:en', name: 'GNews EU AI Act' },

  // Labor
  { url: 'https://news.google.com/search?q=AI+job+layoff+unemployment&hl=en-US&gl=US&ceid=US:en', name: 'GNews Jobs' },
  { url: 'https://news.google.com/search?q=AI+automation+workers&hl=en-US&gl=US&ceid=US:en', name: 'GNews Automation' },

  // Robotics / Autonomous
  { url: 'https://news.google.com/search?q=autonomous+vehicle+self+driving&hl=en-US&gl=US&ceid=US:en', name: 'GNews Autonomous' },
  { url: 'https://news.google.com/search?q=AI+robot+robotics&hl=en-US&gl=US&ceid=US:en', name: 'GNews Robotics' },
];

async function scrapeGoogleNews(browser, target) {
  let discovered = 0;
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));

    // Extract article links from Google News - they use /read/ URLs
    const links = await page.evaluate(() => {
      const articles = [];
      document.querySelectorAll('a[href*="/read/"]').forEach(a => {
        const title = a.textContent?.trim();
        const href = a.href;
        if (title && title.length > 15 && href) {
          articles.push({ title: title.slice(0, 200), url: href });
        }
      });
      return articles.slice(0, 30);
    });

    for (const item of links) {
      if (!item.url || !item.url.startsWith('http')) continue;
      try {
        await sb('prospects', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({
            url: item.url,
            title: item.title.slice(0, 300),
            source_name: target.name,
            status: 'found'
          })
        });
        discovered++;
      } catch (e) { /* duplicate */ }
    }
  } catch (e) {
    console.log(`  Scrape error ${target.name}: ${e.message?.slice(0, 50)}`);
  } finally {
    await page.close();
  }
  return discovered;
}

async function discoverFromScraping(browser) {
  let total = 0;
  for (const target of SCRAPE_TARGETS) {
    const found = await scrapeGoogleNews(browser, target);
    total += found;
    process.stdout.write(found > 0 ? `[${found}]` : '[.]');
  }
  return total;
}

async function main() {
  console.log('=== Jetson Browser Crawler ===');
  console.log(`Chromium: ${CHROMIUM_PATH}`);
  console.log(`RSS Feeds: ${RSS_FEEDS.length}`);
  console.log(`Scrape Targets: ${SCRAPE_TARGETS.length}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  console.log('Browser ready.\n');

  let totalDiscovered = 0, totalFetched = 0, totalPromoted = 0;
  let cycle = 0;

  try {
    while (true) {
      cycle++;
      const time = new Date().toLocaleTimeString();

      // Discover from RSS feeds via Puppeteer
      process.stdout.write(`[${time}] Feeds: `);
      const feedDiscovered = await discoverFromFeeds(browser);
      totalDiscovered += feedDiscovered;
      console.log(` → +${feedDiscovered} new`);

      // Scrape Google News every cycle (32 queries)
      process.stdout.write(`[${time}] Scrape: `);
      const scrapeDiscovered = await discoverFromScraping(browser);
      totalDiscovered += scrapeDiscovered;
      console.log(` → +${scrapeDiscovered} new`);

      // Fetch articles in 'found' status
      const batch = await sb('prospects?status=eq.found&select=id,url,title&order=discovered_at&limit=25');
      if (batch.length > 0) {
        process.stdout.write(`[${time}] Articles: `);
        for (const p of batch) {
          const result = await fetchArticle(browser, p);
          totalFetched++;
          if (result.status === 'promoted') {
            totalPromoted++;
            process.stdout.write('✓');
          } else if (result.status === 'rejected') {
            process.stdout.write('-');
          } else {
            process.stdout.write('x');
          }
        }
        console.log('');
      }

      console.log(`  ═══ cycle=${cycle} discovered=${totalDiscovered} fetched=${totalFetched} promoted=${totalPromoted} ═══\n`);

      // Brief pause between cycles
      await new Promise(r => setTimeout(r, 5000));
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
