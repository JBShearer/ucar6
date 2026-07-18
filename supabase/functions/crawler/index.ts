// UCAR 6.0 — crawler
// Direct RSS feeds only. Google News scraping is gone: it 503s bots and
// wraps URLs in redirects that fail fetch. Direct feeds worked in every
// prior run; unreliable sources are noise, not coverage.
//
// Actions (POST, header x-admin-key required):
//   ?action=run        poll due sources, fetch found articles, score, promote
//   ?action=seed_urls  body {urls: string[]} — file specific URLs (backfill)
//   ?action=status     pipeline counts

import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ADMIN_KEY = Deno.env.get("ADMIN_KEY")!;
const UA = "UCARBot/6.0 (+https://usecasearmsrace.com; public-interest AI docket)";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

// ---------------------------------------------------------------- scoring
const AI_TERMS = ["ai","artificial intelligence","machine learning","algorithm","facial recognition","llm","large language model","chatbot","neural","deep learning","gpt","claude","gemini","copilot","computer vision","biometric","deepfake","autonomous","predictive","generative"];
const DEPLOY_TERMS = ["deploy","launch","roll out","rolled out","use","using","adopt","install","implement","introduce","expand","pilot","test","ban","sue","lawsuit","arrest","deny","fire","hire","monitor","surveil","track","scan","flag"];
const HARM_TERMS = ["privacy","surveillance","bias","discrimination","wrongful","error","mistake","harm","abuse","exploit","breach","leak","misinformation","scam","fraud"];

function score(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const w of AI_TERMS) if (t.includes(w)) s += 2;
  for (const w of DEPLOY_TERMS) if (t.includes(w)) s += 1;
  for (const w of HARM_TERMS) if (t.includes(w)) s += 1;
  return s;
}
const PROMOTE_THRESHOLD = 6;

// ---------------------------------------------------------------- parsing
function parseFeed(xml: string): { url: string; title: string }[] {
  const items: { url: string; title: string }[] = [];
  const grab = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : null;
  };
  // RSS 2.0
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const url = grab(m[0], "link");
    const title = grab(m[0], "title");
    if (url && title) items.push({ url, title });
  }
  // Atom
  for (const m of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)) {
    const href = m[0].match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const title = grab(m[0], "title");
    if (href && title) items.push({ url: href, title });
  }
  return items.slice(0, 40);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#\d+;|&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,*/*" }, signal: ctl.signal, redirect: "follow" });
    if (!r.ok) throw new Error(`http ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

// ---------------------------------------------------------------- stages
async function discover(): Promise<number> {
  const cutoff = new Date(Date.now() - 50 * 60 * 1000).toISOString();
  const { data: due } = await sb.from("sources").select("*")
    .eq("enabled", true)
    .or(`last_polled_at.is.null,last_polled_at.lt.${cutoff}`)
    .limit(6);
  let found = 0;
  for (const src of due ?? []) {
    try {
      const xml = await fetchText(src.url);
      const items = parseFeed(xml);
      for (const it of items) {
        const { error } = await sb.from("prospects")
          .upsert({ url: it.url, title: it.title.slice(0, 300), source_name: src.name },
                  { onConflict: "url", ignoreDuplicates: true });
        if (!error) found++;
      }
      await sb.from("sources").update({ last_polled_at: new Date().toISOString(), error_count: 0 }).eq("id", src.id);
    } catch (e) {
      await sb.from("sources").update({
        last_polled_at: new Date().toISOString(),
        error_count: (src.error_count ?? 0) + 1,
        enabled: (src.error_count ?? 0) + 1 < 20, // auto-disable dead feeds
      }).eq("id", src.id);
      console.error(`source ${src.name}: ${e}`);
    }
  }
  return found;
}

async function fetchAndScore(max: number): Promise<{ fetched: number; promoted: number; rejected: number }> {
  const { data: batch } = await sb.from("prospects").select("id, url, title")
    .eq("status", "found").order("discovered_at", { ascending: true }).limit(max);
  let fetched = 0, promoted = 0, rejected = 0;
  for (const p of batch ?? []) {
    try {
      const html = await fetchText(p.url);
      const text = stripHtml(html).slice(0, 20000);
      if (text.length < 500) throw new Error("too little text");
      const s = score(`${p.title} ${text.slice(0, 4000)}`);
      const status = s >= PROMOTE_THRESHOLD ? "promoted" : "rejected";
      await sb.from("prospects").update({
        status, score: s, raw_text: status === "promoted" ? text : null,
        updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      fetched++;
      if (status === "promoted") promoted++; else rejected++;
    } catch (e) {
      await sb.from("prospects").update({ status: "error", error: String(e).slice(0, 300), updated_at: new Date().toISOString() }).eq("id", p.id);
    }
  }
  return { fetched, promoted, rejected };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: CORS });
  }
  const action = new URL(req.url).searchParams.get("action") ?? "run";

  if (action === "status") {
    const { data } = await sb.from("prospects").select("status");
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
    const { count: cases } = await sb.from("cases").select("*", { count: "exact", head: true });
    const { count: filings } = await sb.from("filings").select("*", { count: "exact", head: true });
    return Response.json({ prospects: counts, cases, filings }, { headers: CORS });
  }

  if (action === "seed_urls") {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
    let added = 0;
    for (const url of urls.slice(0, 200)) {
      const { error } = await sb.from("prospects")
        .upsert({ url, title: url, source_name: "manual" }, { onConflict: "url", ignoreDuplicates: true });
      if (!error) added++;
    }
    return Response.json({ added }, { headers: CORS });
  }

  // action=run: one pipeline pass, bounded for edge function time limits
  const found = await discover();
  const fs = await fetchAndScore(20);
  return Response.json({ discovered: found, ...fs, next: "extract picks up promoted prospects on its own cron" }, { headers: CORS });
});
