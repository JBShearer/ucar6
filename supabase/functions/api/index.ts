// UCAR 6.0 — api
// Only what the browser cannot do directly through PostgREST + RLS:
//   ?action=search       hybrid keyword + semantic search (needs embeddings)
//   ?action=similar      nearby cases for a case id (vector neighbors)
// Admin (x-admin-key):
//   ?action=vocab_pending      list pending terms
//   ?action=vocab_approve      {term_id}
//   ?action=vocab_merge        {term_id, into_id}  (re-points cases, learns alias)
//   ?action=set_show           {show_date?, title, video_url, blurb}
// Feed, case detail, votes, tracks, and whats-new all go straight to
// PostgREST from the browser under RLS. Fewer moving parts, faster.

import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ADMIN_KEY = Deno.env.get("ADMIN_KEY")!;

// deno-lint-ignore no-explicit-any
const embedder = new (Supabase as any).ai.Session("gte-small");

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const action = new URL(req.url).searchParams.get("action") ?? "search";
  const body = await req.json().catch(() => ({}));

  // ------------------------------------------------------------- public
  if (action === "search") {
    const q = String(body.q ?? "").trim().slice(0, 200);
    if (!q) return json({ results: [] });
    const qvec = await embedder.run(q, { mean_pool: true, normalize: true });
    const { data: hits, error } = await sb.rpc("hybrid_search_filings", {
      p_q: q, p_qvec: qvec, p_limit: Math.min(Number(body.limit) || 30, 60),
    });
    if (error) return json({ error: error.message }, 500);
    const ids = (hits ?? []).map((h: { filing_id: string }) => h.filing_id);
    if (ids.length === 0) return json({ results: [] });
    const { data: filings } = await sb.from("filings")
      .select("id, headline, summary, subject, source_url, source_domain, impact, created_at, cases(id, case_number, title_render, filing_count, good_votes, evil_votes, fake_votes)")
      .in("id", ids).eq("status", "live");
    const rank = new Map(ids.map((id: string, i: number) => [id, i]));
    filings?.sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
    return json({ results: filings ?? [] });
  }

  if (action === "similar") {
    const caseId = String(body.case_id ?? "");
    const { data: c } = await sb.from("cases").select("embedding").eq("id", caseId).single();
    if (!c?.embedding) return json({ results: [] });
    const { data } = await sb.rpc("similar_cases", { p_case_id: caseId, p_limit: 6 });
    return json({ results: data ?? [] });
  }

  // ------------------------------------------------------------- admin
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) return json({ error: "unauthorized" }, 401);

  if (action === "vocab_pending") {
    const { data } = await sb.from("vocab_terms").select("id, kind, term, created_at")
      .eq("status", "pending").order("created_at");
    return json({ pending: data ?? [] });
  }

  if (action === "vocab_approve") {
    await sb.from("vocab_terms").update({ status: "active" }).eq("id", body.term_id);
    // cases held in review only for this term can go live
    return json({ ok: true, note: "run vocab_release to flip review cases with fully active vocab" });
  }

  if (action === "vocab_merge") {
    const { term_id, into_id } = body;
    const { data: from } = await sb.from("vocab_terms").select("term, kind").eq("id", term_id).single();
    if (!from) return json({ error: "term not found" }, 404);
    await sb.from("vocab_aliases").upsert(
      { term_id: into_id, alias: from.term, learned_from: "manual" },
      { onConflict: "term_id,alias", ignoreDuplicates: true },
    );
    // Re-point cases. Collisions with an existing triple mean the filings
    // move and the duplicate case retires; done in SQL for atomicity.
    const { error } = await sb.rpc("merge_vocab_term", { p_from: term_id, p_into: into_id });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "vocab_release") {
    // Flip review cases to live where every term is now active.
    const { data, error } = await sb.rpc("release_review_cases");
    if (error) return json({ error: error.message }, 500);
    return json({ released: data });
  }

  if (action === "set_show") {
    const row = {
      show_date: body.show_date ?? new Date().toISOString().slice(0, 10),
      title: String(body.title ?? "").slice(0, 200),
      video_url: body.video_url ?? null,
      blurb: body.blurb ?? null,
    };
    const { error } = await sb.from("daily_show").upsert(row, { onConflict: "show_date" });
    return error ? json({ error: error.message }, 500) : json({ ok: true, ...row });
  }

  return json({ error: `unknown action ${action}` }, 400);
});
