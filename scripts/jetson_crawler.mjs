#!/usr/bin/env node
// Jetson Crawler for UCAR
// Runs alongside the main crawler to increase throughput
// Calls the Supabase crawler edge function

const SUPABASE_URL = 'https://znhsnishdqrmumxbgobq.supabase.co';
const ADMIN_KEY = '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87';

async function runCrawler() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/crawler?action=run`, {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_KEY,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });

  if (!res.ok) {
    throw new Error(`Crawler failed: ${res.status}`);
  }

  return res.json();
}

async function getStatus() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/crawler?action=status`, {
    headers: { 'x-admin-key': ADMIN_KEY }
  });
  return res.json();
}

async function main() {
  console.log('=== Jetson UCAR Crawler ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  let totalDiscovered = 0;
  let totalFetched = 0;
  let totalPromoted = 0;
  let cycles = 0;

  // Run continuously with 2 minute intervals
  while (true) {
    try {
      cycles++;
      const result = await runCrawler();

      totalDiscovered += result.discovered || 0;
      totalFetched += result.fetched || 0;
      totalPromoted += result.promoted || 0;

      console.log(`[${new Date().toLocaleTimeString()}] Cycle ${cycles}: discovered=${result.discovered} fetched=${result.fetched} promoted=${result.promoted}`);

      // Every 10 cycles, show totals
      if (cycles % 10 === 0) {
        const status = await getStatus();
        console.log(`  --- Totals: discovered=${totalDiscovered} fetched=${totalFetched} promoted=${totalPromoted}`);
        console.log(`  --- Queue: ${JSON.stringify(status.prospects)} | Cases: ${status.cases} | Filings: ${status.filings}`);
      }

    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
    }

    // Wait 2 minutes between cycles
    await new Promise(r => setTimeout(r, 120000));
  }
}

main().catch(console.error);
