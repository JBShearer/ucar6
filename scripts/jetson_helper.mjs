#!/usr/bin/env node
// Jetson Crawler Helper for UCAR
// Calls the Supabase crawler function frequently to speed up discovery

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const ADMIN_KEY = '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87';

async function runCrawler() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/crawler?action=run`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY, 'Content-Type': 'application/json' },
    body: '{}'
  });
  return res.json();
}

async function main() {
  console.log('=== Jetson Crawler Helper ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  let totalDiscovered = 0;
  let totalFetched = 0;
  let totalPromoted = 0;
  let cycles = 0;

  while (true) {
    cycles++;
    const time = new Date().toLocaleTimeString();

    try {
      const r = await runCrawler();
      totalDiscovered += r.discovered || 0;
      totalFetched += r.fetched || 0;
      totalPromoted += r.promoted || 0;

      console.log(`[${time}] Cycle ${cycles}: discovered=${r.discovered} fetched=${r.fetched} promoted=${r.promoted}`);

      if (cycles % 10 === 0) {
        console.log(`  --- Totals: discovered=${totalDiscovered} fetched=${totalFetched} promoted=${totalPromoted}`);
      }

    } catch (e) {
      console.error(`[${time}] Error: ${e.message}`);
    }

    // Run every 2 minutes
    await new Promise(r => setTimeout(r, 120000));
  }
}

main().catch(console.error);
