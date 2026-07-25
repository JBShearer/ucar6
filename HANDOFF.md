# UCAR 6.1 — Use Case Arms Race

## What It Is

A gamified AI news aggregator that tracks AI use cases as legal "cases" on a public docket. Users vote GOOD/EVIL on each case, track cases they care about, and explore through filters. Includes an adventure game layer and a "Doomsday Slots" randomizer.

**Live URL:** https://jbshearer.github.io/ucar6/  
**Repo:** https://github.com/JBShearer/ucar6 (gh-pages branch)

---

## The Case Model (Semantic Language)

Every AI use case is structured as:

```
[VERB] [OBJECT] · WITH [INSTRUMENT]
```

### Examples:
- `SCREEN JOB APPLICANTS · WITH LARGE LANGUAGE MODELS`
- `GENERATE DEEPFAKE VIDEOS · WITH DIFFUSION MODELS`
- `SURVEIL CITIZENS · WITH FACIAL RECOGNITION SYSTEMS`

### Ontology (vocab_terms table):

| Kind | Description | Examples |
|------|-------------|----------|
| `verb` | The action being performed | SCREEN, GENERATE, SURVEIL, DETECT, TRAIN |
| `object_class` | What's being acted upon | JOB APPLICANTS, VIDEOS, CITIZENS, TUMORS |
| `instrument` | The AI technology used | LARGE LANGUAGE MODELS, DIFFUSION MODELS, COMPUTER VISION |
| `actor` | WHO is deploying the AI | Microsoft, Google, Police, Hospitals, Researchers |
| `target` | WHOM is affected | Workers, Students, Patients, Users, Citizens |

### Case Normalization:
- Cases are deduplicated by matching verb + object + instrument
- Multiple news articles ("filings") can belong to the same case
- Embedding similarity finds related cases

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   RSS Feeds     │────▶│  Supabase Edge   │────▶│   Supabase DB   │
│  (50+ sources)  │     │    Functions     │     │   (PostgREST)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               │ Claude API              │
                               ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Extraction     │     │  Static Site    │
                        │   (LLM parsing)  │     │  (GitHub Pages) │
                        └──────────────────┘     └─────────────────┘
```

### Data Flow:
1. **Crawler** polls RSS feeds → inserts `prospects` (status: found)
2. **Crawler** fetches article HTML → scores relevance → promotes or rejects
3. **Extractor** takes promoted prospects → calls Claude API → parses into structured case
4. **Extractor** resolves vocab terms → creates/updates case → creates filing
5. **Frontend** queries cases/filings via PostgREST

---

## Supabase Project

**Project ID:** `znhsnishdqrmumxbgobq`  
**URL:** `https://znhsnishdqrmumxbgobq.supabase.co`

### Tables:

| Table | Purpose |
|-------|---------|
| `cases` | The docket — each unique AI use case |
| `filings` | News articles linked to cases |
| `prospects` | Crawl queue (found → promoted → extracted) |
| `sources` | RSS feed URLs and polling state |
| `vocab_terms` | Controlled vocabulary (verb, object, instrument, actor, target) |
| `vocab_aliases` | Learned synonyms for fuzzy matching |
| `votes` | User GOOD/EVIL votes per case |
| `tracks` | User case subscriptions |
| `comments` | User comments on cases |
| `users` | Auth via Supabase anonymous auth |

### Key Columns on `cases`:
```sql
id              UUID PRIMARY KEY
case_number     SERIAL (human-readable: "CASE #1234")
verb_id         FK → vocab_terms (kind='verb')
object_class_id FK → vocab_terms (kind='object_class')
instrument_id   FK → vocab_terms (kind='instrument')
actor_id        FK → vocab_terms (kind='actor')      -- WHO deploys
target_id       FK → vocab_terms (kind='target')     -- WHOM affected
title_render    TEXT  -- "VERB OBJECT · WITH INSTRUMENT"
domain          TEXT  -- category (health, finance, law, etc.)
filing_count    INT   -- denormalized article count
good_votes      INT   -- denormalized
evil_votes      INT   -- denormalized
embedding       vector(384)  -- for similarity search
status          TEXT  -- 'live' | 'review' | 'merged'
```

### Key Columns on `filings`:
```sql
id              UUID PRIMARY KEY
case_id         FK → cases
headline        TEXT
summary         TEXT
article_quote   TEXT  -- key excerpt
source_url      TEXT UNIQUE
source_domain   TEXT
published_at    TIMESTAMP
actor           TEXT  -- raw extracted (denormalized)
target          TEXT  -- raw extracted (denormalized)
image_url       TEXT
status          TEXT  -- 'live' | 'hidden'
```

---

## Edge Functions

Located in `/supabase/functions/`

### 1. `crawler/index.ts`
**Trigger:** POST with `x-admin-key` header  
**Actions:**
- `?action=run` — Poll RSS feeds, fetch articles, score, promote
- `?action=seed_urls` — Backfill specific URLs
- `?action=status` — Queue counts

**Scoring:** Articles score 6+ on AI terms (ai, llm, neural, etc.) + deployment terms (deploy, use, ban) + harm terms (bias, surveillance) get promoted.

### 2. `extract/index.ts`
**Trigger:** POST with `x-admin-key` header  
**Actions:**
- `?action=run` — Process promoted prospects via Claude API
- `?action=embed_vocab` — Backfill embeddings
- `?action=status` — Queue counts

**Extraction Prompt:** Parses article into:
```json
{
  "skip": false,
  "verb": "SCREEN",
  "object_class": "JOB APPLICANTS",
  "instrument": "LARGE LANGUAGE MODELS",
  "actor": "Amazon",
  "target": "Job Seekers",
  "headline": "...",
  "summary": "...",
  "domain": "employment"
}
```

### 3. `api/index.ts`
**Public API for frontend:**
- `?action=similar` — Find similar cases by embedding
- `?action=stats` — Dashboard stats

---

## Environment Variables (Edge Functions)

Set in Supabase Dashboard → Edge Functions → Secrets:

```
SUPABASE_URL=https://znhsnishdqrmumxbgobq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role key)
ADMIN_KEY=4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87
ANTHROPIC_API_KEY=sk-ant-... (Claude API key)
EXTRACT_MODEL=claude-haiku-4-5  (or claude-sonnet-4-6)
```

---

## Frontend (index.html)

Single 5000-line HTML file with embedded CSS and JS. Key sections:

| Lines | Section |
|-------|---------|
| 1-50 | CSS variables (light/dark themes) |
| 50-700 | CSS styles |
| 700-900 | Mobile responsive styles |
| 900-1200 | HTML structure |
| 1200-2000 | Game/adventure system |
| 2000-3000 | Filter and casebook UI |
| 3000-4000 | Article/case rendering |
| 4000-5000 | Drawer, modals, utilities |

### Key JavaScript Functions:
- `loadFeed()` — Fetch and render articles
- `loadFilters()` — Populate filter dropdowns
- `loadTopicOptions()` — Load WHO/WHOM/VERB filters
- `openCase(id)` — Open case detail drawer
- `caseCard(c)` — Render case in list
- `articleCard(a)` — Render article in feed
- `syncTrackButtons(caseId)` — Update track UI across views

---

## Local Scripts

In `/scripts/`:

| Script | Purpose |
|--------|---------|
| `seed_rss.mjs` | Fetch RSS feeds into prospects table |
| `local_extract.mjs` | Process prospects via Hyperspace (local LLM proxy) |
| `backfill_case_actors_llm.mjs` | Backfill actor_id/target_id using LLM |
| `fix_stub_urls.mjs` | Find real article URLs for radio/podcast stubs |
| `feeds.json` | RSS feed configuration |

### Running Locally:
```bash
cd /Users/I530341/Documents/Evil Brain Production/ucar6_1

# Seed new articles
node scripts/seed_rss.mjs

# Extract (requires Hyperspace running on localhost:6655)
node scripts/local_extract.mjs
```

---

## Deployment

### Frontend (GitHub Pages):
```bash
git add -A
git commit -m "description"
git push origin gh-pages
```

### Edge Functions (Supabase CLI):
```bash
supabase functions deploy crawler
supabase functions deploy extract
supabase functions deploy api
```

### Triggering Pipeline:
```bash
# Run crawler
curl -X POST "https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/crawler?action=run" \
  -H "x-admin-key: 4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87"

# Run extractor
curl -X POST "https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/extract?action=run" \
  -H "x-admin-key: 4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87" \
  -H "Content-Type: application/json" \
  -d '{"max": 10}'
```

---

## Known Issues

### 1. Edge Function Crawler Bug
The crawler doesn't save `raw_text` for promoted prospects. The extract function then fails with "Cannot read properties of null".

**Fix needed:** Ensure `fetchAndScore()` actually fetches article content and saves it.

### 2. WHO/WHOM Filters Light
Many cases have generic actors ("Researchers", "Developers") instead of specific companies. The backfill used case titles instead of article content.

**Fix needed:** Re-run backfill using filing headlines/summaries.

### 3. Stub URLs
Some RSS feeds (BBC) include podcast/radio URLs that don't have article content.

**Fix needed:** Detect `/sounds/play/`, `/iplayer/`, `/live:` patterns and search for real article.

### 4. Mobile Legibility
Font sizes were too small. Increased base sizes but may need further refinement.

---

## Recommended Refactor

### 1. Consolidate to Edge Functions
- Move all crawling/extraction to Supabase Edge Functions
- Use Claude API directly (not Hyperspace)
- Set up Supabase cron to trigger hourly

### 2. Clean Codebase
- Split index.html into components
- Use a build tool (Vite) for CSS/JS
- Add TypeScript for frontend

### 3. Fix Data Pipeline
- Crawler must save raw_text
- Extract must handle null gracefully
- Add retry logic for failed extractions

### 4. UI Refresh
- Larger touch targets
- Cleaner typography (16px minimum)
- Better mobile navigation
- Loading states

---

## Credentials Summary

| Service | Credential |
|---------|------------|
| Supabase Project | znhsnishdqrmumxbgobq |
| Supabase Anon Key | eyJhbG...k22R9k... (in index.html) |
| Supabase Service Key | eyJhbG...Lry_nN... (in scripts) |
| Admin Key | 4654bd1c...ef55cd87 |
| GitHub Repo | JBShearer/ucar6 (gh-pages branch) |

---

## File Structure

```
ucar6_1/
├── index.html              # Main app (5000 lines)
├── HANDOFF.md              # This file
├── supabase/
│   └── functions/
│       ├── api/index.ts    # Public API
│       ├── crawler/index.ts # RSS crawler
│       └── extract/index.ts # LLM extractor
├── scripts/
│   ├── feeds.json          # RSS sources
│   ├── seed_rss.mjs        # Local RSS fetcher
│   ├── local_extract.mjs   # Local extractor
│   └── backfill_*.mjs      # Data maintenance
└── game/
    └── doomsday_stories.js # Adventure game content
```

---

## Contact

Built by Evil Brain Labs — "World's Third Worst AI Company"

Site: https://evilbrainlabs.com
