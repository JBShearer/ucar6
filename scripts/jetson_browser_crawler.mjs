
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Jetson Browser Crawler for UCAR
// Uses Puppeteer to scrape JS-rendered pages and bypass basic anti-bot
//
// Install on Jetson:
//   npm install puppeteer-core
//   # Chromium should already be installed on Jetson

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Jetson Chromium path - adjust if needed
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error('Install puppeteer-core: npm install puppeteer-core');
  process.exit(1);
}

// AI relevance scoring
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

async function fetchWithBrowser(browser, url, timeout = 30000) {
  const page = await browser.newPage();

  try {
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Block images/fonts/css to speed up loading
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Wait a bit for JS to render
    await page.waitForTimeout(2000);

    const html = await page.content();
    return html;

  } finally {
    await page.close();
  }
}

async function processProspect(browser, prospect) {
  const { id, url, title } = prospect;

  try {
    console.log(`  Fetching: ${url.slice(0, 60)}...`);
    const html = await fetchWithBrowser(browser, url);
    const text = stripHtml(html).slice(0, 20000);

    if (text.length < 500) {
      throw new Error('too little text');
    }

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

  } catch (err) {
    await sb(`prospects?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'error',
        error: err.message?.slice(0, 300),
        updated_at: new Date().toISOString()
      })
    });
    return { status: 'error', error: err.message };
  }
}

async function main() {
  console.log('=== Jetson Browser Crawler ===');
  console.log(`Chromium: ${CHROMIUM_PATH}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Launch browser once, reuse for all pages
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });

  console.log('Browser launched.\n');

  let totalFetched = 0;
  let totalPromoted = 0;
  let cycles = 0;

  try {
    while (true) {
      cycles++;
      const time = new Date().toLocaleTimeString();

      // Get prospects that need fetching (status = 'found')
      const batch = await sb('prospects?status=eq.found&select=id,url,title&order=discovered_at&limit=5');

      if (batch.length === 0) {
        console.log(`[${time}] No prospects to fetch. Waiting...`);
        await new Promise(r => setTimeout(r, 60000)); // Wait 1 min if empty
        continue;
      }

      console.log(`[${time}] Processing ${batch.length} prospects...`);

      for (const p of batch) {
        const result = await processProspect(browser, p);
        totalFetched++;
        if (result.status === 'promoted') {
          totalPromoted++;
          console.log(`    ✓ Promoted (score=${result.score}): ${p.title.slice(0, 50)}`);
        } else if (result.status === 'rejected') {
          console.log(`    - Rejected (score=${result.score})`);
        } else {
          console.log(`    ✗ Error: ${result.error?.slice(0, 40)}`);
        }
      }

      console.log(`  Totals: fetched=${totalFetched} promoted=${totalPromoted}\n`);

      // Small delay between batches
      await new Promise(r => setTimeout(r, 5000));
    }

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
