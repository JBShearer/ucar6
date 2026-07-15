#!/usr/bin/env bash
# UCAR 6.0 one-shot deploy.
# Run from the repo root. Requires: supabase CLI (logged in), git, and a .env file.
#
#   cp .env.example .env   # fill it in, then:
#   ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "Missing .env — copy .env.example and fill it in."; exit 1; }
set -a; source .env; set +a

for v in PROJECT_REF SUPABASE_URL SUPABASE_ANON_KEY ADMIN_KEY ANTHROPIC_API_KEY; do
  [ -n "${!v:-}" ] || { echo "Missing $v in .env"; exit 1; }
done
[[ "$PROJECT_REF" =~ ^[a-z]{20}$ ]] || { echo "PROJECT_REF must be the 20-char ref from your Supabase dashboard URL (not a placeholder)."; exit 1; }

echo "==> 1/6 Link project"
supabase link --project-ref "$PROJECT_REF"

echo "==> 2/6 Push migrations (schema + seed + admin functions)"
supabase db push

echo "==> 3/6 Set function secrets"
supabase secrets set ADMIN_KEY="$ADMIN_KEY" ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

echo "==> 4/6 Deploy edge functions"
supabase functions deploy crawler extract api --no-verify-jwt

echo "==> 5/6 Backfill vocabulary embeddings"
curl -sf -X POST "$SUPABASE_URL/functions/v1/extract?action=embed_vocab" \
  -H "x-admin-key: $ADMIN_KEY" | head -c 300; echo
# gte-small embeds 200 terms per call; loop until clean
for i in 1 2 3; do
  curl -sf -X POST "$SUPABASE_URL/functions/v1/extract?action=embed_vocab" \
    -H "x-admin-key: $ADMIN_KEY" > /dev/null
done

echo "==> 6/6 Build web/ with real keys"
mkdir -p dist
sed -e "s|__SUPABASE_URL__|$SUPABASE_URL|g" \
    -e "s|__SUPABASE_ANON_KEY__|$SUPABASE_ANON_KEY|g" \
    web/index.html > dist/index.html

sed -e "s|__PROJECT_REF__|$PROJECT_REF|g" \
    -e "s|__ADMIN_KEY__|$ADMIN_KEY|g" \
    supabase/setup_cron.sql > dist/setup_cron.filled.sql

echo
echo "DONE. Two manual steps remain (dashboard-only by design):"
echo "  A. Supabase Dashboard -> SQL editor -> run dist/setup_cron.filled.sql"
echo "     (enable pg_cron + pg_net under Database -> Extensions first)"
echo "  B. Supabase Dashboard -> Authentication -> Sign In -> enable 'Anonymous sign-ins'"
echo
echo "Publish dist/index.html to GitHub Pages:"
echo "  git checkout --orphan gh-pages && git rm -rf . && cp dist/index.html index.html"
echo "  git add index.html && git commit -m 'ucar6' && git push -f origin gh-pages"
echo "  (or point Pages at /dist on main in repo Settings -> Pages)"
echo
echo "Smoke test:"
echo "  curl -X POST \"$SUPABASE_URL/functions/v1/crawler?action=run\" -H \"x-admin-key: \$ADMIN_KEY\""
echo "  curl -X POST \"$SUPABASE_URL/functions/v1/extract?action=run\" -H \"x-admin-key: \$ADMIN_KEY\" -d '{\"max\":3}'"
echo "  curl -X POST \"$SUPABASE_URL/functions/v1/crawler?action=status\" -H \"x-admin-key: \$ADMIN_KEY\""
