#!/usr/bin/env bash
# Reset demo DB from committed seed fixture
set -euo pipefail

echo "=== ShipComply DB Reset ==="
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL" -f "$(dirname "$0")/seed-supabase.sql"
echo "=== DB reset complete ==="
