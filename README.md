# UCAR 6.0 — Use Case Arms Race

A public docket of AI deployments. Semantic-triple cases, news-event filings,
good/evil/fake votes, tracked case files, a daily show slot, and a crawler
that files new cases while you sleep.

## The locked ontology

```
CASE    identity = VERB + OBJECT_CLASS + INSTRUMENT      (unique triple)
        title    = "SURVEIL STUDENTS · WITH FACIAL RECOGNITION"
FILING  = one source URL: WHO (subject) did the triple, details, quote, impact
```

This is frozen in the schema (`unique (verb_id, instrument_id, object_key)`),
not in a prompt. Prefix a filing's subject and you get the news sentence:
*Rutgers University* SURVEILS STUDENTS WITH FACIAL RECOGNITION. Suffix with
object_details for the indirect object. The triple is the vector; nearby
cases come from pgvector HNSW neighbors.

## Architecture

```
15 RSS feeds ──► crawler fn ──► prospects (found→promoted)      every 20 min
                                    │
                promoted ──► extract fn ──► Claude Haiku         every 10 min
                                    │  raw verb/object/instrument
                                    ▼
                       match_vocab() resolution ladder (SQL)
                       exact → alias → trigram → embedding
                          │ hit: learn alias          │ miss: mint PENDING,
                          ▼                           ▼ case → review queue
                       resolve_case() triple upsert ──► cases + filings
                                    │
GitHub Pages (static) ◄── PostgREST + RLS (feed, cases, votes, tracks)
                      ◄── api fn (hybrid search, similar cases, admin)
```

Embeddings are `gte-small` (384-dim) running **inside** the Supabase edge
runtime. No OpenAI key, no proxy, no 401s. One Anthropic key, stored as a
function secret.

## Why every prior build failed, and the structural fix

| Old failure | 6.0 fix |
|---|---|
| Case identity flip-flopped between prompt versions | Identity is a DB unique constraint; prompts can't change it |
| LLM minted vocabulary despite "MUST reuse" prompts | Resolution in SQL; unmatched terms are pending, never canonical |
| Embedding rung dead (OpenAI 401) so fuzzy match fell through | gte-small in the edge runtime, zero external dependency |
| Two extraction paths (edge fn + Jetson worker) diverged | One path. The worker is retired |
| Nonsense cases from non-deployment articles | Relevance gate: model returns `skip` with a reason |
| Google News 503s poisoned the crawl | Direct RSS only, with auto-disable for dying feeds |
| pg_cron "still needs manual SQL" forever | deploy.sh emits a filled-in cron file; runbook step, not a TODO |
| service_role key pasted into logged shell commands | .env + supabase secrets; rotation is runbook step zero |

## Repo layout

```
supabase/migrations/   00001 schema · 00002 seed vocab+sources · 00003 admin fns
supabase/functions/    crawler · extract · api        (Deno edge functions)
supabase/setup_cron.sql
web/index.html         single-file frontend (GitHub Pages)
deploy.sh              one-shot deploy
RUNBOOK.md             start here
```
