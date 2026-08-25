// /sitemap.xml — the docket's invitation to crawlers, regenerated at the edge.
// The SPA hides 4,800+ case pages behind JavaScript; this is how Google learns
// they exist. Static routes first, then every live case with its freshness.
// Fail-open to a minimal sitemap: an empty response teaches crawlers to leave.

const SB = "https://srokszgtbdmmdxgozqvg.supabase.co";
const KEY = "sb_publishable_aSbFo4SJa2p5ojVqh2ozyQ_JzyNK1SY";
const SITE = "https://usecasearmsrace.com";

const STATIC = ["/", "/about", "/forks"];

export async function onRequest() {
  let cases = [];
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/sitemap_cases`, {
      method: "POST",
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: "{}",
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (r.ok) cases = await r.json();
  } catch { /* minimal sitemap below */ }

  const urls = [
    ...STATIC.map((p) => `<url><loc>${SITE}${p}</loc><changefreq>daily</changefreq></url>`),
    ...(Array.isArray(cases) ? cases : []).map(
      (c) => `<url><loc>${SITE}/case/${c.id}</loc><lastmod>${c.m}</lastmod></url>`
    ),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600",
    },
  });
}
