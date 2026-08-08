#!/bin/bash
# Local extraction via Hyperspace proxy with Opus
set -e

cd "/Users/I530341/Documents/Evil Brain Production/ucar6_1"
source .env

HYPERSPACE_URL="http://localhost:6655/anthropic/v1/messages"
HYPERSPACE_TOKEN=""
MODEL="anthropic--claude-4.8-opus"
SERVICE_KEY=""

read -r -d '' EXTRACTION_PROMPT << 'PROMPT'
You extract structured filings for UCAR, a public docket tracking AI capabilities AND harms.

CRITICAL: DIAGRAM THE SENTENCE FIRST.

Before extracting, identify the core claim:
  [AGENT] does [ACTION] to [PATIENT] using [INSTRUMENT]

Examples:
- "Spotify launches AI music assistant" → RECOMMEND USERS · WITH CHATBOTS (not GENERATE AUDIO)
- "OpenAI releases video model" → GENERATE VIDEO · WITH DIFFUSION MODELS
- "Company screens applicants with AI" → DISCRIMINATE APPLICANTS · WITH AUTOMATED DECISION SYSTEMS
- "Researchers train on copyrighted books" → EXPLOIT WRITERS · WITH LARGE LANGUAGE MODELS

ASK: What does the AI ACTUALLY DO to whom/what?

SKIP (skip=true): Policy-only articles, business news without products, opinion pieces, pure math papers.

ONTOLOGY - ONE TERM EACH:

verb (ONE):
  HARM: HARM, EXPLOIT, SURVEIL, TRACK, PROFILE, DISCRIMINATE, MANIPULATE, DECEIVE, DENY, CENSOR, TARGET
  CAPABILITY: GENERATE, CLASSIFY, DETECT, RECOGNIZE, TRANSLATE, SUMMARIZE, REASON, SOLVE, PREDICT, SIMULATE, SYNTHESIZE, ANALYZE
  PRODUCT: RECOMMEND, RANK, FILTER, MODERATE, CURATE, ASSIST, AUTOMATE, MATCH, PERSONALIZE

object_class (ONE):
  People: children, students, workers, patients, users, citizens, borrowers, applicants, suspects, customers, artists, writers
  Things: images, video, audio, text, speech, code, molecules, proteins, games, problems, knowledge, disease, music

instrument (ONE): generative ai, large language models, chatbots, facial recognition, recommendation algorithms, neural networks, deep learning, automated decision systems, computer vision, reinforcement learning, diffusion models, transformers

domain (ONE): consumer, healthcare, education, finance, law enforcement, workplace, social media, government, military, research, entertainment, science, robotics

Return JSON only:
{"skip": false, "headline": "...", "summary": "...", "verb": "ONE", "object_class": "ONE", "instrument": "ONE", "domain": "ONE", "subject": "company or null", "impact": 1-5}
Or: {"skip": true, "reason": "..."}
PROMPT

echo "=== Local Extraction via Hyperspace (Opus) ==="
echo "Model: $MODEL"

PROCESSED=0

while true; do
  # Get one prospect at a time to avoid subshell issues
  PROSPECT=$(curl -s "${SUPABASE_URL}/rest/v1/prospects?select=id,url,title,raw_text&status=eq.promoted&raw_text=not.is.null&limit=1" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")

  ID=$(echo "$PROSPECT" | jq -r '.[0].id // empty')

  if [ -z "$ID" ]; then
    echo "=== Queue empty ==="
    break
  fi

  URL=$(echo "$PROSPECT" | jq -r '.[0].url')
  TITLE=$(echo "$PROSPECT" | jq -r '.[0].title')
  RAW_TEXT=$(echo "$PROSPECT" | jq -r '.[0].raw_text')

  # Call Hyperspace with Opus
  RESPONSE=$(curl -s "$HYPERSPACE_URL" \
    -H "Authorization: Bearer $HYPERSPACE_TOKEN" \
    -H "Content-Type: application/json" \
    -H "anthropic-version: 2023-06-01" \
    --data-binary @- << EOF
{
  "model": "$MODEL",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": $(echo "$EXTRACTION_PROMPT

SOURCE TEXT:
$RAW_TEXT" | head -c 14000 | jq -Rs .)
  }]
}
EOF
)

  # Parse response
  CONTENT=$(echo "$RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null | sed 's/```json//g; s/```//g')

  if [ -z "$CONTENT" ]; then
    echo "✗ Empty response: $TITLE"
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"status": "error", "error": "Empty response"}' > /dev/null
    continue
  fi

  # Check skip
  SKIP=$(echo "$CONTENT" | jq -r '.skip // false' 2>/dev/null)
  if [ "$SKIP" = "true" ]; then
    REASON=$(echo "$CONTENT" | jq -r '.reason // "skipped"' | head -c 200)
    echo "- Skip: $TITLE"
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"status\": \"skipped\", \"error\": $(echo "$REASON" | jq -Rs .)}" > /dev/null
    continue
  fi

  # Extract fields
  VERB=$(echo "$CONTENT" | jq -r '.verb // empty' | tr '[:lower:]' '[:upper:]')
  OBJECT=$(echo "$CONTENT" | jq -r '.object_class // empty' | tr '[:upper:]' '[:lower:]')
  INSTRUMENT=$(echo "$CONTENT" | jq -r '.instrument // empty' | tr '[:upper:]' '[:lower:]')
  DOMAIN=$(echo "$CONTENT" | jq -r '.domain // empty' | tr '[:upper:]' '[:lower:]')
  HEADLINE=$(echo "$CONTENT" | jq -r '.headline // empty')
  SUMMARY=$(echo "$CONTENT" | jq -r '.summary // empty')
  SUBJECT=$(echo "$CONTENT" | jq -r '.subject // empty')
  IMPACT=$(echo "$CONTENT" | jq -r '.impact // 3')

  if [ -z "$VERB" ] || [ -z "$INSTRUMENT" ]; then
    echo "✗ Missing fields: $TITLE"
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"status": "error", "error": "Missing verb or instrument"}' > /dev/null
    continue
  fi

  # Build case title
  if [ -n "$OBJECT" ] && [ "$OBJECT" != "null" ]; then
    CASE_TITLE="${VERB} ${OBJECT} · WITH ${INSTRUMENT}"
  else
    CASE_TITLE="${VERB} · WITH ${INSTRUMENT}"
  fi
  CASE_TITLE=$(echo "$CASE_TITLE" | tr '[:lower:]' '[:upper:]')

  # Check if case exists
  EXISTING=$(curl -s "${SUPABASE_URL}/rest/v1/cases?title_render=eq.$(echo "$CASE_TITLE" | jq -Rr @uri)" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY")
  CASE_ID=$(echo "$EXISTING" | jq -r '.[0].id // empty')

  if [ -z "$CASE_ID" ]; then
    # Create new case
    NEW_CASE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/cases" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{\"title_render\": $(echo "$CASE_TITLE" | jq -Rs .), \"domain\": $(echo "$DOMAIN" | jq -Rs .)}")
    CASE_ID=$(echo "$NEW_CASE" | jq -r '.[0].id // empty')
  fi

  if [ -z "$CASE_ID" ]; then
    echo "✗ Case failed: $CASE_TITLE"
    curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"status": "error", "error": "Case creation failed"}' > /dev/null
    continue
  fi

  # Create filing
  SOURCE_DOMAIN=$(echo "$URL" | sed -E 's|https?://([^/]+).*|\1|' | sed 's/^www\.//')

  FILING_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/filings" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"case_id\": \"$CASE_ID\",
      \"headline\": $(echo "$HEADLINE" | jq -Rs .),
      \"summary\": $(echo "$SUMMARY" | jq -Rs .),
      \"subject\": $(if [ -n "$SUBJECT" ] && [ "$SUBJECT" != "null" ]; then echo "$SUBJECT" | jq -Rs .; else echo "null"; fi),
      \"source_url\": $(echo "$URL" | jq -Rs .),
      \"source_domain\": $(echo "$SOURCE_DOMAIN" | jq -Rs .),
      \"domain\": $(echo "$DOMAIN" | jq -Rs .),
      \"impact\": $IMPACT,
      \"status\": \"live\"
    }")

  FILING_ID=$(echo "$FILING_RESULT" | jq -r '.[0].id // empty')

  if [ -z "$FILING_ID" ]; then
    echo "✗ Filing failed: $HEADLINE"
    # Check for duplicate
    if echo "$FILING_RESULT" | grep -q "duplicate"; then
      curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
        -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "extracted"}' > /dev/null
    else
      curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
        -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "error", "error": "Filing creation failed"}' > /dev/null
    fi
    continue
  fi

  # Success
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/prospects?id=eq.$ID" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "extracted"}' > /dev/null

  echo "✓ $CASE_TITLE"

  PROCESSED=$((PROCESSED + 1))
  if [ $((PROCESSED % 10)) -eq 0 ]; then
    REMAINING=$(curl -s "${SUPABASE_URL}/rest/v1/prospects?select=id&status=eq.promoted" \
      -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" | jq 'length')
    echo "--- Processed: $PROCESSED | Remaining: $REMAINING ---"
  fi
done

echo "=== Done. Total: $PROCESSED ==="
