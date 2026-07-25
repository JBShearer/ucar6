# UCAR 6.1 → 7.0 Migration Tasks

## Phase 1: Fix Data Pipeline (Critical)

### Task 1.1: Fix Crawler Edge Function
**File:** `supabase/functions/crawler/index.ts`
**Problem:** `raw_text` not being saved for promoted prospects
**Fix:**
1. In `fetchAndScore()`, ensure HTML is fetched successfully
2. Verify `text` variable has content before promotion
3. Add logging to debug fetch failures
4. Test: After run, check `prospects` table for `raw_text` not null

### Task 1.2: Fix Extract Edge Function
**File:** `supabase/functions/extract/index.ts`
**Problem:** Crashes on null `raw_text` with "Cannot read properties of null"
**Fix:**
1. Add null check before `article.slice()`
2. Skip prospects with empty raw_text, mark as error
3. Add retry logic for transient failures

### Task 1.3: Set Up Supabase Cron
**Location:** Supabase Dashboard → Database → Extensions → pg_cron
**Schedule:**
```sql
-- Run crawler every hour
SELECT cron.schedule('ucar-crawler', '7 * * * *', 
  $$SELECT net.http_post(
    'https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/crawler?action=run',
    '{}',
    'application/json',
    ARRAY[http_header('x-admin-key', '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87')]
  )$$
);

-- Run extractor every hour (15 min after crawler)
SELECT cron.schedule('ucar-extract', '22 * * * *',
  $$SELECT net.http_post(
    'https://znhsnishdqrmumxbgobq.supabase.co/functions/v1/extract?action=run',
    '{"max": 20}',
    'application/json',
    ARRAY[http_header('x-admin-key', '4654bd1c847c4d0a1b199e8e7f6de27f6198af8d0f442290d6ed9407ef55cd87')]
  )$$
);
```

---

## Phase 2: Switch to Claude API

### Task 2.1: Update Extract Function for Claude API
**File:** `supabase/functions/extract/index.ts`
**Current:** Uses `ANTHROPIC_API_KEY` env var
**Verify:** Model is set to `claude-haiku-4-5` or `claude-sonnet-4-6`
**Test:** Deploy and run `?action=run` with a few prospects

### Task 2.2: Remove Hyperspace Dependencies
**Files:** `scripts/local_extract.mjs`, `scripts/backfill_*.mjs`
**Action:** These can be archived or converted to use Claude API directly
**Note:** Keep for local testing if needed

---

## Phase 3: Data Quality

### Task 3.1: Re-backfill Actor/Target from Filings
**Problem:** Current actor_id/target_id came from case titles, not article content
**Fix:**
1. Clear actor_id/target_id on all cases
2. Run backfill that reads filing headlines/summaries
3. Use aggressive prompt to extract specific company names

### Task 3.2: Deduplicate Vocab Terms
**Problem:** Multiple similar terms (e.g., "microsoft", "Microsoft Corp")
**Fix:**
1. Query vocab_terms grouped by similarity
2. Merge duplicates, update FKs
3. Add aliases for common variations

### Task 3.3: Fix Stub URLs
**Problem:** Some filings link to BBC radio/podcast pages
**Patterns to detect:** `/sounds/play/`, `/iplayer/`, `/live:`
**Fix:** Search for real article URL using headline

---

## Phase 4: UI Refresh

### Task 4.1: Mobile Typography
**File:** `index.html` lines 700-900
**Goal:** Minimum 14px font on mobile, 16px preferred
**Areas:**
- [ ] Filter buttons
- [ ] Case titles
- [ ] Article summaries
- [ ] Action buttons
- [ ] Drawer content

### Task 4.2: Simplify Filter UI
**Current:** 5 topic filters + good/evil + time
**Proposal:** 
- Primary: Good/Evil toggle
- Secondary: WHO dropdown (companies)
- Tertiary: Search box
- Hide VERB/OBJECT/INSTRUMENT behind "Advanced"

### Task 4.3: Improve Case Cards
**Current:** Dense with small text
**Proposal:**
- Larger title (18-20px)
- Clear vote counts with icons
- Prominent track button
- Article count as badge

### Task 4.4: Loading States
**Problem:** No feedback while data loads
**Fix:**
- Skeleton loaders for article list
- Spinner in casebook
- "Loading..." in drawer

---

## Phase 5: Code Cleanup

### Task 5.1: Split index.html
**Current:** 5000 lines, unmaintainable
**Target Structure:**
```
src/
├── index.html        # Shell only
├── styles/
│   ├── base.css
│   ├── components.css
│   └── mobile.css
├── scripts/
│   ├── app.js        # Init and state
│   ├── api.js        # Supabase calls
│   ├── ui.js         # Rendering
│   ├── filters.js    # Filter logic
│   └── game.js       # Adventure system
└── components/
    ├── article-card.js
    ├── case-card.js
    └── drawer.js
```

### Task 5.2: Add Build Tool
**Recommendation:** Vite
**Benefits:**
- CSS/JS bundling
- Hot reload for development
- Tree shaking
- Source maps

### Task 5.3: TypeScript (Optional)
**Files:** Edge functions are already TypeScript
**Frontend:** Could add `.ts` files with Vite
**Priority:** Low — focus on stability first

---

## Phase 6: Testing

### Task 6.1: Pipeline Test Script
```bash
#!/bin/bash
# test_pipeline.sh

echo "1. Running crawler..."
curl -s -X POST "$SUPABASE_URL/functions/v1/crawler?action=run" \
  -H "x-admin-key: $ADMIN_KEY" | jq

echo "2. Checking prospects..."
curl -s "$SUPABASE_URL/rest/v1/prospects?status=eq.promoted&limit=5" \
  -H "apikey: $SERVICE_KEY" | jq 'length'

echo "3. Running extractor..."
curl -s -X POST "$SUPABASE_URL/functions/v1/extract?action=run" \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"max": 5}' | jq

echo "4. Checking new filings..."
curl -s "$SUPABASE_URL/rest/v1/filings?order=created_at.desc&limit=5" \
  -H "apikey: $SERVICE_KEY" | jq '.[].headline'
```

### Task 6.2: Monitor Errors
**Location:** Supabase Dashboard → Logs → Edge Functions
**Watch for:**
- 401 Unauthorized (API key issues)
- 500 errors in extract (Claude API failures)
- Timeout errors (increase function timeout if needed)

---

## Priority Order

1. **Task 1.1 + 1.2** — Fix pipeline (nothing works without this)
2. **Task 1.3** — Set up cron (automation)
3. **Task 4.1** — Mobile typography (user-facing)
4. **Task 3.1** — Re-backfill actors (data quality)
5. **Task 5.1** — Split codebase (maintainability)
6. Everything else

---

## Definition of Done

- [ ] Pipeline runs automatically every hour
- [ ] New articles appear within 2 hours of publication
- [ ] Mobile fonts are readable (14px minimum)
- [ ] WHO filter shows real company names
- [ ] No JavaScript errors in console
- [ ] Edge functions have < 1% error rate
