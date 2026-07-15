# UCAR 6.0 Runbook

Total time to live site: about 30 minutes. Do the steps in order. Steps 0 and 1
are manual because they involve credentials. Everything after is one script.

## 0. Rotate the leaked key (do this first, today)

Your saved terminal transcript contains the full `service_role` JWT for project
`aslcrwmbdtvimjrexxzw` pasted into shell commands. That key bypasses all
row-level security.

1. Supabase Dashboard -> Settings -> API -> `service_role` -> rotate.
2. Delete or scrub `Terminal_Saved_Output.txt` and any other saved logs.
3. From now on, keys live in `.env` (gitignored) and `supabase secrets`, never
   inline in shell commands. Claude Code sessions log everything you paste.

## 1. Decide: same project or fresh

Recommended: **fresh Supabase project.** The old one has drifted schema, two
competing extraction paths, and mixed-ontology cases (#101-#155 include both
VERB+INSTRUMENT and VERB+OBJECT+INSTRUMENT identities). A clean project costs
nothing and the backfill below rebuilds the corpus correctly. If you must keep
the old project, you'll need to reset (`supabase db reset --linked` destroys
data) before pushing these migrations.

Also delete the stray directory. You have `~/Documents/ai-usecase-social` AND
`~/Documents/Evil Brain Production/ucar5`. Pick ONE home for this repo
(suggest `~/Documents/Evil Brain Production/ucar6`) and delete the other.
Half your deploy failures were commands run in the wrong directory.

## 2. Deploy

```bash
cd ~/Documents/Evil\ Brain\ Production/ucar6
cp .env.example .env        # fill in all five values
chmod +x deploy.sh
./deploy.sh
```

The script links, pushes migrations, sets secrets, deploys the three
functions, embeds the vocabulary, and writes `dist/index.html` (frontend with
real keys) plus `dist/setup_cron.filled.sql`.

Then the two dashboard-only steps the script prints:

- SQL editor -> run `dist/setup_cron.filled.sql` (enable pg_cron + pg_net
  extensions first). This is the piece that never got done in the old build;
  without it nothing runs automatically.
- Authentication -> Sign In -> enable **Anonymous sign-ins** (votes and
  tracking use anonymous auth; no signup friction).

Publish `dist/index.html` to GitHub Pages per the script's instructions.

## 3. Smoke test (5 minutes)

```bash
source .env
curl -X POST "$SUPABASE_URL/functions/v1/crawler?action=run"    -H "x-admin-key: $ADMIN_KEY"
curl -X POST "$SUPABASE_URL/functions/v1/extract?action=run"    -H "x-admin-key: $ADMIN_KEY" -d '{"max":3}'
curl -X POST "$SUPABASE_URL/functions/v1/crawler?action=status" -H "x-admin-key: $ADMIN_KEY"
```

You should see prospects move found -> promoted -> extracted, and cases with
titles shaped `SURVEIL STUDENTS · WITH FACIAL RECOGNITION`. Anything the
article isn't actually an AI deployment gets `skipped` with a reason (this is
the relevance gate that used to produce STAKE · WITH SOVEREIGN WEALTH FUND).

## 4. The road to 100,000 cases

The cron gives you a steady drip (15 feeds, every 20 min). For bulk backfill:

```bash
# Feed it URL lists. GDELT exports, AIAAIC incident database, AI Incident
# Database (incidentdatabase.ai) dumps are the highest-density sources.
curl -X POST "$SUPABASE_URL/functions/v1/crawler?action=seed_urls" \
  -H "x-admin-key: $ADMIN_KEY" -H "content-type: application/json" \
  -d '{"urls": ["https://...", "https://..."]}'
```

Then let the cron chew through it, or hammer `extract?action=run` in a loop.
Cost check before you scale: at ~8k input tokens per article on Haiku,
100k extractions is a real API bill (rough order: low four figures USD).
Run 1,000 first, check quality and spend, then decide batch size. The AI
Incident Database alone gets you several thousand pre-vetted incidents.

## 5. Weekly operations (10 minutes)

Vocabulary review is the one human job. New terms the resolver couldn't match
land as `pending` and their cases sit in `review` (visible but flagged):

```bash
# See what the LLM proposed that didn't resolve
curl -X POST "$SUPABASE_URL/functions/v1/api?action=vocab_pending" -H "x-admin-key: $ADMIN_KEY"

# Legit new concept -> approve
curl -X POST "$SUPABASE_URL/functions/v1/api?action=vocab_approve" -H "x-admin-key: $ADMIN_KEY" \
  -d '{"term_id":"<uuid>"}'

# Duplicate of an existing term -> merge (re-points cases, learns the alias)
curl -X POST "$SUPABASE_URL/functions/v1/api?action=vocab_merge" -H "x-admin-key: $ADMIN_KEY" \
  -d '{"term_id":"<uuid>", "into_id":"<canonical uuid>"}'

# Release review cases whose vocab is now fully active
curl -X POST "$SUPABASE_URL/functions/v1/api?action=vocab_release" -H "x-admin-key: $ADMIN_KEY"
```

Every merge teaches an alias, so the pending queue shrinks over time instead
of the vocabulary bloating. That is the inversion of the old failure mode.

## 6. Daily show

```bash
curl -X POST "$SUPABASE_URL/functions/v1/api?action=set_show" -H "x-admin-key: $ADMIN_KEY" \
  -d '{"title":"Episode 12: The Docket Never Sleeps","video_url":"https://youtu.be/...","blurb":"Today Evil Brain reviews Case No. 214."}'
```

The site renders it in the stamped "Today's Show" box with the Case File Box
(your tracked cases) directly beneath it.

## What was retired, on purpose

- The Jetson/Ollama local worker and `extraction_prompt_v5.txt`. One
  extraction path only. The Jetson can stay for Evil Brain; it is not in the
  pipeline.
- Google News scraping (permanent 503s) and the Cloudflare Worker proxy
  (edge functions call api.anthropic.com directly with a proper secret).
- Vocabulary lists injected into the prompt. The prompt now asks for natural
  atomic terms; the database resolves them. LLMs propose, Postgres disposes.
