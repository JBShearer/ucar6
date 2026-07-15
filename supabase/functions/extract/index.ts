// UCAR 6.0 — extract
// The ONLY extraction path. No local workers, no second prompt file.
//
// Actions (POST, header x-admin-key required):
//   ?action=run          process promoted prospects (body: {max?: number})
//   ?action=embed_vocab  backfill embeddings for vocab terms missing them
//   ?action=status       queue counts
//
// Flow per prospect:
//   Claude proposes raw terms -> match_vocab() resolves each against the
//   closed vocabulary (exact -> alias -> trigram -> embedding). Unresolved
//   terms are inserted as status='pending' and the case is status='review'.
//   Inexact matches are learned as aliases. The LLM never controls the
//   vocabulary; the database does.

import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ADMIN_KEY = Deno.env.get("ADMIN_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("EXTRACT_MODEL") ?? "claude-haiku-4-5";

// gte-small runs inside the edge runtime. 384 dims, no API key, no 401s.
// deno-lint-ignore no-explicit-any
const embedder = new (Supabase as any).ai.Session("gte-small");
async function embed(text: string): Promise<number[]> {
  return await embedder.run(text.slice(0, 2000), { mean_pool: true, normalize: true });
}

const EXTRACTION_PROMPT = `You extract structured filings for UCAR, a public docket of AI deployments.

ONTOLOGY (fixed):
- verb: the single action the AI performs. One lowercase verb lemma. "surveil", not "surveil students", not "surveilling".
- object_class: the CLASS of who or what is acted on. Lowercase plural common noun ("students", "workers", "images"). Never a named organization. null if genuinely none.
- instrument: the AI technology used. Short lowercase noun phrase ("facial recognition", "large language models"). Not a sentence. Not the verb restated.
- subject: the named deployer ("Cobb County Police", "OpenAI"). null if unnamed.

RELEVANCE GATE: If the article is not about an AI system being deployed, used, abused, or applied to something, return {"skip": true, "reason": "<why>"}. Funding rounds, executive departures, opinion pieces, and ownership news are skips.

Return ONLY a JSON object, no markdown fences:
{
  "skip": false,
  "headline": "cleaned article headline",
  "summary": "1-2 sentences, max 60 words, past tense, neutral, keep concrete numbers",
  "article_quote": "one verbatim quote from the source, 20-300 chars, or null",
  "verb": "...",
  "object_class": "... or null",
  "instrument": "...",
  "subject": "... or null",
  "object_details": {},
  "instrument_details": {},
  "impact": 1
}

RULES:
- verb, instrument required when skip is false.
- Do not pack the object into the verb. Bad: verb="moderate content". Good: verb="moderate", object_class="content".
- Do not restate the verb in the instrument. Bad: instrument="content moderation of content".
- impact: 1 trivial, 3 meaningful to a group, 5 severe or society-scale.`;

async function callClaude(article: string): Promise<Record<string, unknown> | null> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nSOURCE TEXT:\n${article.slice(0, 12000)}`,
      }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text).join("\n")
    .replace(/```json|```/g, "").trim();
  try { return JSON.parse(text); } catch { return null; }
}

interface Resolved { termId: string; canonical: string; method: string; pending: boolean }

async function resolveTerm(kind: string, raw: string | null): Promise<Resolved | null> {
  if (!raw || !raw.trim()) return null;
  const norm = raw.trim().toLowerCase();
  const vec = await embed(norm);
  const { data, error } = await sb.rpc("match_vocab", {
    p_kind: kind, p_raw: norm, p_embedding: vec,
  });
  if (error) throw new Error(`match_vocab: ${error.message}`);

  if (data && data.length > 0) {
    const m = data[0];
    // Learn inexact matches as aliases so the ladder gets shorter over time.
    if ((m.method === "trigram" || m.method === "embedding") && norm !== m.canonical) {
      await sb.from("vocab_aliases").upsert(
        { term_id: m.term_id, alias: norm, learned_from: m.method },
        { onConflict: "term_id,alias", ignoreDuplicates: true },
      );
    }
    return { termId: m.term_id, canonical: m.canonical, method: m.method, pending: false };
  }

  // No match anywhere on the ladder: mint as PENDING, never silently canonical.
  const { data: ins } = await sb.from("vocab_terms")
    .upsert({ kind, term: norm, status: "pending", embedding: vec },
            { onConflict: "kind,term", ignoreDuplicates: false })
    .select("id, term").single();
  if (!ins) throw new Error(`pending mint failed for ${kind}:${norm}`);
  return { termId: ins.id, canonical: ins.term, method: "minted_pending", pending: true };
}

function renderTitle(verb: string, objectClass: string | null, instrument: string): string {
  const head = objectClass ? `${verb} ${objectClass}` : verb;
  return `${head.toUpperCase()} · WITH ${instrument.toUpperCase()}`;
}

async function processOne(p: { id: string; url: string; raw_text: string }) {
  const extracted = await callClaude(p.raw_text);
  if (!extracted) {
    await sb.from("prospects").update({ status: "error", error: "unparseable LLM output", updated_at: new Date().toISOString() }).eq("id", p.id);
    return { url: p.url, result: "error" };
  }
  if (extracted.skip) {
    await sb.from("prospects").update({ status: "skipped", error: String(extracted.reason ?? ""), updated_at: new Date().toISOString() }).eq("id", p.id);
    return { url: p.url, result: "skipped", reason: extracted.reason };
  }

  const verb = await resolveTerm("verb", extracted.verb as string);
  const instrument = await resolveTerm("instrument", extracted.instrument as string);
  const objectClass = await resolveTerm("object_class", extracted.object_class as string | null);
  if (!verb || !instrument) {
    await sb.from("prospects").update({ status: "error", error: "missing verb or instrument", updated_at: new Date().toISOString() }).eq("id", p.id);
    return { url: p.url, result: "error" };
  }

  const anyPending = verb.pending || instrument.pending || (objectClass?.pending ?? false);
  const title = renderTitle(verb.canonical, objectClass?.canonical ?? null, instrument.canonical);
  const caseVec = await embed(title.toLowerCase());

  const { data: caseId, error: caseErr } = await sb.rpc("resolve_case", {
    p_verb: verb.termId,
    p_object: objectClass?.termId ?? null,
    p_instrument: instrument.termId,
    p_title: title,
    p_status: anyPending ? "review" : "live",
    p_embedding: caseVec,
  });
  if (caseErr) throw new Error(`resolve_case: ${caseErr.message}`);

  const summary = String(extracted.summary ?? "").slice(0, 500);
  const filingVec = await embed(`${extracted.headline} ${summary}`);
  const domain = (() => { try { return new URL(p.url).hostname.replace(/^www\./, ""); } catch { return null; } })();

  const { error: filErr } = await sb.from("filings").upsert({
    case_id: caseId,
    headline: String(extracted.headline ?? "").slice(0, 300),
    summary,
    article_quote: extracted.article_quote ?? null,
    subject: extracted.subject ?? null,
    raw_verb: extracted.verb ?? null,
    raw_object_class: extracted.object_class ?? null,
    raw_instrument: extracted.instrument ?? null,
    object_details: extracted.object_details ?? {},
    instrument_details: extracted.instrument_details ?? {},
    impact: Number(extracted.impact) >= 1 && Number(extracted.impact) <= 5 ? Number(extracted.impact) : null,
    source_url: p.url,
    source_domain: domain,
    status: "live",
    embedding: filingVec,
  }, { onConflict: "source_url", ignoreDuplicates: true });
  if (filErr) throw new Error(`filing insert: ${filErr.message}`);

  await sb.from("prospects").update({ status: "extracted", updated_at: new Date().toISOString() }).eq("id", p.id);
  return { url: p.url, result: "extracted", case_title: title, review: anyPending };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const action = new URL(req.url).searchParams.get("action") ?? "run";

  if (action === "status") {
    const { data } = await sb.from("prospects").select("status");
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return Response.json({ queue: counts });
  }

  if (action === "embed_vocab") {
    // Batch 20 at a time to stay under edge runtime resource limits
    const { data: terms } = await sb.from("vocab_terms").select("id, term").is("embedding", null).limit(20);
    for (const t of terms ?? []) {
      await sb.from("vocab_terms").update({ embedding: await embed(t.term) }).eq("id", t.id);
    }
    const { count } = await sb.from("vocab_terms").select("*", { count: "exact", head: true }).is("embedding", null);
    return Response.json({ embedded: terms?.length ?? 0, remaining: count ?? 0 });
  }

  // action=run
  const body = await req.json().catch(() => ({}));
  const max = Math.min(Number(body.max) || 5, 10);
  const { data: batch } = await sb.from("prospects")
    .select("id, url, raw_text")
    .eq("status", "promoted")
    .order("discovered_at", { ascending: true })
    .limit(max);

  const results = [];
  for (const p of batch ?? []) {
    try {
      results.push(await processOne(p));
    } catch (e) {
      await sb.from("prospects").update({ status: "error", error: String(e).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", p.id);
      results.push({ url: p.url, result: "error", error: String(e).slice(0, 200) });
    }
  }
  return Response.json({ processed: results.length, results });
});
