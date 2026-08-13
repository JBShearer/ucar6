// Per-case link previews, rendered at the edge.
//
// GitHub Pages served the same index.html for every /case/<id>, so every shared
// link unfurled with the same generic card. Crawlers do not run JavaScript, so
// they never saw the case. This Function fetches the case, injects real
// og:title / og:description / og:image into the HTML, and hands the identical
// page to the browser — the app boots as normal and the user sees no difference.
//
// Deliberately fail-open: any error returns the untouched page rather than an
// error screen. A generic preview is a small loss; a broken case page is not.

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
  const { params, next, request } = context;
  const page = await next();               // the static index.html Pages would serve

  try {
    const id = String(params.id ?? "");
    if (!UUID.test(id)) return page;       // not a case id: leave it alone

    const [kase] = await sb(
      `cases?id=eq.${id}&select=case_number,title_render,filing_count,good_votes,evil_votes&limit=1`,
    );
    if (!kase) return page;

    // WHICH ARTICLE IS THIS LINK ABOUT?
    //
    // A shared link carries ?f=<filing> — the article the sender was actually
    // reading. Without it this fell back to whichever filing was NEWEST in the
    // case, so sharing a 2023 story unfurled with a 2026 headline and a
    // stranger's photograph. The card has to describe what the sender saw.
    const want = new URL(request.url).searchParams.get("f");
    // `id` is in the select because the card's image is served from /og/<id>.
    const cols = "id,headline_render,headline,summary,image_url";
    let filing = null;
    if (want && UUID.test(want)) {
      [filing] = await sb(`filings?id=eq.${want}&case_id=eq.${id}&status=eq.live&select=${cols}&limit=1`);
    }
    if (!filing) {
      [filing] = await sb(
        `filings?case_id=eq.${id}&status=eq.live&select=${cols}` +
        `&order=published_at.desc.nullslast&limit=1`,
      );
    }

    const no = `CASE #${String(kase.case_number ?? 0).padStart(4, "0")}`;
    const n = kase.filing_count ?? 0;
    const verdict =
      (kase.evil_votes ?? 0) > (kase.good_votes ?? 0) ? "Currently voted EVIL"
      : (kase.good_votes ?? 0) > (kase.evil_votes ?? 0) ? "Currently voted GOOD"
      : "No verdict yet";
    // ?f= NAMES THE STORY, SO THE STORY LEADS. A shared article unfurled with
    // the case grammar as its headline ("SURVEIL SURVEILLANCE DATA · WITH
    // SURVEILLANCE INTEGRATION SYSTEMS…") and the actual story demoted to the
    // description. Sender saw a headline; the card must show that headline.
    const sharedStory = want && UUID.test(want) && filing
      ? (filing.headline_render || filing.headline) : null;
    const title = sharedStory ? sharedStory.slice(0, 300) : `${no} · ${kase.title_render}`;
    const desc = (sharedStory
      ? `${no} · ${kase.title_render} · ${verdict}`
      : (filing?.headline_render || filing?.headline || filing?.summary ||
         `${n} filing${n === 1 ? "" : "s"} on the public docket.`)
    ).slice(0, 300);
    // THROUGH OUR OWN DOMAIN, ALWAYS.
    //
    // Pointing at the publisher's CDN meant LinkedIn had to fetch a picture
    // from a host that blocks unknown crawlers, and it silently rendered a
    // card with no image. /og/<filing> re-serves the same photograph from
    // here, and falls back to the docket's own card if the source is gone.
    const image = filing?.id ? `${SITE}/og/${filing.id}` : `${SITE}/og-image.png`;
    const url = want && UUID.test(want) ? `${SITE}/case/${id}?f=${want}` : `${SITE}/case/${id}`;

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
    <meta name="twitter:image" content="${esc(image)}" />
    <meta name="ucar:verdict" content="${esc(verdict)}" />`;

    let html = await page.text();
    // Drop the generic tags, then insert the case-specific ones.
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+(?:name|property)=["'](?:description|og:[a-z:]+|twitter:[a-z:]+)["'][^>]*>\s*/gi, "")
      .replace(/<\/head>/i, `${tags}\n  </head>`);

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Short edge cache: votes and filings change, previews should not be stale for long.
        "cache-control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch {
    return page;   // fail open
  }
}
