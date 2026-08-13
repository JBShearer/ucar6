// /f/<filing> — the STORY link's preview, rendered at the edge.
//
// Article shares used to be /case/<id>?f=<filing>: SMS linkifiers chew query
// strings, and the card led with the CASE grammar instead of the headline the
// sender was reading. This path is short, query-free, and the preview leads
// with the STORY — the case is the byline, not the headline. The app resolves
// /f/<id> to the case page with the article open.
//
// Fail-open like /case/<id>: any error serves the untouched page.

const SB = "https://srokszgtbdmmdxgozqvg.supabase.co";
const KEY = "sb_publishable_aSbFo4SJa2p5ojVqh2ozyQ_JzyNK1SY";
const SITE = "https://usecasearmsrace.com";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sb(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return await r.json();
}

export async function onRequest(context) {
  const { params, next } = context;
  const page = await next();

  try {
    const id = String(params.id ?? "");
    if (!UUID.test(id)) return page;

    const [filing] = await sb(
      `filings?id=eq.${id}&status=eq.live&select=id,case_id,headline_render,headline,summary,source_domain&limit=1`,
    );
    if (!filing) return page;
    const [kase] = await sb(
      `cases?id=eq.${filing.case_id}&select=case_number,title_render,good_votes,evil_votes&limit=1`,
    );

    // THE STORY LEADS. The case is context in the description.
    const title = (filing.headline_render || filing.headline || "Filed on the docket").slice(0, 300);
    const no = kase ? `CASE #${String(kase.case_number ?? 0).padStart(4, "0")}` : "";
    const verdict = !kase ? "" :
      (kase.evil_votes ?? 0) > (kase.good_votes ?? 0) ? " · Currently voted EVIL"
      : (kase.good_votes ?? 0) > (kase.evil_votes ?? 0) ? " · Currently voted GOOD"
      : "";
    const desc = (kase
      ? `${no} · ${kase.title_render}${verdict}`
      : (filing.summary ?? "")).slice(0, 300);
    const image = `${SITE}/og/${filing.id}`;
    const url = `${SITE}/f/${filing.id}`;

    const tags = `
    <title>${esc(title)} · Use Case Arms Race</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Use Case Arms Race" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:secure_url" content="${esc(image)}" />
    <meta property="og:image:alt" content="${esc(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />`;

    let html = await page.text();
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+(?:name|property)=["'](?:description|og:[a-z:]+|twitter:[a-z:]+)["'][^>]*>\s*/gi, "")
      .replace(/<\/head>/i, `${tags}\n  </head>`);

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch {
    return page;   // fail open
  }
}
