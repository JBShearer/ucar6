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

  // Public: submit a vocab suggestion (requires auth)
  if (action === "suggest_vocab") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "auth required" }, 401);

    const { case_id, kind, suggested_term, reason } = body;
    if (!kind || !suggested_term) return json({ error: "kind and suggested_term required" }, 400);
    if (!["verb", "object_class", "instrument"].includes(kind)) {
      return json({ error: "kind must be verb, object_class, or instrument" }, 400);
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "invalid token" }, 401);

    const { error } = await sb.from("vocab_suggestions").insert({
      user_id: user.id,
      case_id: case_id || null,
      kind,
      suggested_term: suggested_term.toLowerCase().trim(),
      reason: reason || null,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, message: "Suggestion submitted for review" });
  }

  // ------------------------------------------------------------- admin
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) return json({ error: "unauthorized" }, 401);

  // Admin: list suggestions
  if (action === "list_suggestions") {
    const { data } = await sb.from("vocab_suggestions")
      .select("id, kind, suggested_term, reason, status, created_at, case_id, cases(case_number, title_render)")
      .eq("status", "pending")
      .order("created_at");
    return json({ suggestions: data ?? [] });
  }

  // Admin: approve suggestion (creates vocab term)
  if (action === "approve_suggestion") {
    const { suggestion_id } = body;
    const { data: sug } = await sb.from("vocab_suggestions")
      .select("kind, suggested_term")
      .eq("id", suggestion_id).single();
    if (!sug) return json({ error: "suggestion not found" }, 404);

    // Create the vocab term
    const { error: insertErr } = await sb.from("vocab_terms").insert({
      kind: sug.kind,
      term: sug.suggested_term,
      status: "active",
    });
    if (insertErr && !insertErr.message.includes("duplicate")) {
      return json({ error: insertErr.message }, 500);
    }

    // Mark suggestion approved
    await sb.from("vocab_suggestions").update({ status: "approved" }).eq("id", suggestion_id);
    return json({ ok: true, term: sug.suggested_term });
  }

  // Admin: reject suggestion
  if (action === "reject_suggestion") {
    const { suggestion_id } = body;
    await sb.from("vocab_suggestions").update({ status: "rejected" }).eq("id", suggestion_id);
    return json({ ok: true });
  }

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

  // Review misaligned filings: raw terms vs canonical case terms
  if (action === "review_alignment") {
    const { data: filings } = await sb.from("filings")
      .select(`
        id, headline, raw_verb, raw_object_class, raw_instrument,
        cases(id, case_number, title_render, verb_id, object_class_id, instrument_id)
      `)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(200);

    // Get vocab terms for comparison
    const { data: vocab } = await sb.from("vocab_terms")
      .select("id, term, kind")
      .eq("status", "active");
    const vocabMap = new Map((vocab ?? []).map(v => [v.id, v]));

    const misaligned = [];
    for (const f of filings ?? []) {
      const c = f.cases;
      if (!c) continue;

      const caseVerb = vocabMap.get(c.verb_id)?.term ?? "";
      const caseObj = vocabMap.get(c.object_class_id)?.term ?? "";
      const caseInst = vocabMap.get(c.instrument_id)?.term ?? "";

      // Check if raw terms are significantly different from canonical
      const verbMatch = !f.raw_verb || f.raw_verb.toLowerCase() === caseVerb;
      const objMatch = !f.raw_object_class || f.raw_object_class.toLowerCase() === caseObj;
      const instMatch = !f.raw_instrument || f.raw_instrument.toLowerCase() === caseInst;

      if (!verbMatch || !objMatch || !instMatch) {
        misaligned.push({
          filing_id: f.id,
          headline: f.headline,
          raw: { verb: f.raw_verb, object: f.raw_object_class, instrument: f.raw_instrument },
          canonical: { verb: caseVerb, object: caseObj, instrument: caseInst },
          case_id: c.id,
          case_number: c.case_number,
          case_title: c.title_render,
          mismatch: { verb: !verbMatch, object: !objMatch, instrument: !instMatch }
        });
      }
    }
    return json({ misaligned, total: misaligned.length });
  }

  // Reassign a filing to a different case (or create new)
  if (action === "reassign_filing") {
    const { filing_id, new_case_id } = body;
    if (!filing_id) return json({ error: "filing_id required" }, 400);

    // Get old case to update counts
    const { data: filing } = await sb.from("filings").select("case_id").eq("id", filing_id).single();
    if (!filing) return json({ error: "filing not found" }, 404);

    const oldCaseId = filing.case_id;

    // Update filing
    const { error } = await sb.from("filings").update({ case_id: new_case_id }).eq("id", filing_id);
    if (error) return json({ error: error.message }, 500);

    // Recount old case
    if (oldCaseId) {
      const { count: oldCount } = await sb.from("filings").select("*", { count: "exact", head: true }).eq("case_id", oldCaseId);
      await sb.from("cases").update({ filing_count: oldCount ?? 0 }).eq("id", oldCaseId);
    }

    // Recount new case
    const { count: newCount } = await sb.from("filings").select("*", { count: "exact", head: true }).eq("case_id", new_case_id);
    await sb.from("cases").update({ filing_count: newCount ?? 0 }).eq("id", new_case_id);

    return json({ ok: true, moved_from: oldCaseId, moved_to: new_case_id });
  }

  // Run a SQL migration (for applying schema changes)
  if (action === "run_migration") {
    const sql = String(body.sql ?? "");
    if (!sql) return json({ error: "sql required" }, 400);
    const { error } = await sb.rpc("exec_raw_sql", { sql_text: sql });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: `unknown action ${action}` }, 400);
});
