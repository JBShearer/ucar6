// The preview image, served from OUR domain.
//
// og:image used to point straight at the publisher — statescoop.com, CNN,
// whoever ran the story. That works in a browser and fails in a link unfurler:
// LinkedIn fetches the picture with LinkedInBot, from a CDN that has never
// heard of LinkedInBot, and publisher CDNs routinely challenge or block
// unknown crawlers. LinkedIn gets the page, cannot get the picture, and shows
// a card with no graphic at all.
//
// So the tag now points here. Same origin as the page the crawler has already
// fetched successfully, our cache headers, our content-type.
//
// It is NOT an open proxy: the only thing it will serve is the image_url that
// the named filing already carries in the database. There is no url parameter
// to point somewhere else.

const SB = "https://srokszgtbdmmdxgozqvg.supabase.co";
const KEY = "sb_publishable_aSbFo4SJa2p5ojVqh2ozyQ_JzyNK1SY";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The docket's own card, whenever the source picture cannot be had. A preview
 *  with our stamp on it beats a preview with a hole in it. */
function fallback(origin) {
  return Response.redirect(`${origin}/og-image.png`, 302);
}

export async function onRequest({ params, request }) {
  const origin = new URL(request.url).origin;
  try {
    const id = String(params.filing ?? "").replace(/\.(jpg|jpeg|png|webp)$/i, "");
    if (!UUID.test(id)) return fallback(origin);

    const r = await fetch(
      `${SB}/rest/v1/filings?id=eq.${id}&status=eq.live&select=image_url&limit=1`,
      { headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
        cf: { cacheTtl: 3600, cacheEverything: true } },
    );
    if (!r.ok) return fallback(origin);
    const [row] = await r.json();
    const src = row?.image_url;
    if (!src || !/^https:\/\//i.test(src)) return fallback(origin);

    // Ask as a browser would. Some CDNs serve bots a challenge page and a
    // real user-agent a photograph; we want the photograph.
    const img = await fetch(src, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    const type = img.headers.get("content-type") ?? "";
    if (!img.ok || !type.startsWith("image/")) return fallback(origin);

    return new Response(img.body, {
      headers: {
        "content-type": type,
        // A day at the edge: the picture on a filing does not change.
        "cache-control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return fallback(origin);
  }
}
