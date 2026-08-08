
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set. Export it; never hard-code it. This file leaked a service_role key to a public repo once already.');
}
#!/usr/bin/env node
// Batch fetch prospects - runs locally, no browser needed for most URLs
// Uses fetch + cheerio-style parsing for speed

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const CONCURRENCY = 20;
const BATCH_SIZE = 100;

const AI_KEYWORDS = [
  'artificial intelligence', 'machine learning', ' ai ', ' ai,', ' ai.', 'ai-', '-ai',
  'neural network', 'deep learning', 'chatgpt', 'gpt-4', 'gpt-5', 'gpt4', 'gpt5',
  'llm', 'large language model', 'chatbot', 'chat bot',
  'facial recognition', 'face recognition', 'deepfake', 'deep fake',
  'autonomous', 'self-driving', 'self driving', 'driverless',
  'algorithm', 'robot', 'robotics', 'automation', 'automated',
  'openai', 'anthropic', 'google ai', 'meta ai', 'microsoft ai', 'amazon ai',
  'midjourney', 'stable diffusion', 'dall-e', 'dalle', 'imagen',
  'computer vision', 'image recognition', 'object detection',
  'nlp', 'natural language', 'language model', 'text generation',
  'predictive', 'recommendation', 'personalization',
  'generative ai', 'gen ai', 'genai', 'foundation model',
  'transformer', 'bert', 'claude', 'gemini', 'copilot', 'bard',
  'voice assistant', 'smart speaker', 'alexa', 'siri',
  'sentiment analysis', 'speech recognition', 'voice recognition'
];

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

function extractText(html) {
  // Simple HTML to text - remove tags, decode entities
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([^<]+)</i);
  if (h1) return h1[1].trim();
  const title = html.match(/<title>([^<]+)</i);
  if (title) return title[1].trim();
  return extractMeta(html, 'og:title') || '';
}

async function fetchOne(prospect) {
  try {
    // Skip Google News redirect URLs - they need browser
    if (prospect.url.includes('news.google.com')) {
      return { status: 'skip-gnews' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(prospect.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const text = extractText(html);
    const title = extractTitle(html);
    const fullText = `${title} ${text}`.toLowerCase();

    const isAI = AI_KEYWORDS.some(kw => fullText.includes(kw));

    if (isAI && text.length > 500) {
      await sb(`prospects?id=eq.${prospect.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'promoted',
          raw_text: text.slice(0, 50000),
          og_image: extractMeta(html, 'og:image') || null,
          published_at: extractMeta(html, 'article:published_time') || null,
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
  }
}

async function main() {
  console.log('=== Batch Fetch (No Browser) ===');
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  let total = 0, promoted = 0, rejected = 0, errors = 0, skipped = 0;

  while (true) {
    // Get batch of non-Google-News prospects
    const batch = await sb(`prospects?status=eq.found&url=not.like.*news.google.com*&select=id,url,title&order=discovered_at&limit=${BATCH_SIZE}`);

    if (!batch || batch.length === 0) {
      console.log('\n=== No more non-Google-News prospects ===');
      break;
    }

    // Process in parallel
    const chunks = [];
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      chunks.push(batch.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(p => fetchOne(p)));

      for (const r of results) {
        total++;
        if (r.status === 'promoted') { promoted++; process.stdout.write('✓'); }
        else if (r.status === 'rejected') { rejected++; process.stdout.write('-'); }
        else if (r.status === 'skip-gnews') { skipped++; process.stdout.write('.'); }
        else { errors++; process.stdout.write('x'); }
      }
    }

    console.log(` | ${total} done (${promoted} promoted, ${rejected} rejected, ${errors} errors)`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Total: ${total} | Promoted: ${promoted} | Rejected: ${rejected} | Errors: ${errors} | Skipped: ${skipped}`);
}

main().catch(console.error);
