#!/usr/bin/env bash
# Generate TypeScript API client from FastAPI OpenAPI spec
# Called by: pnpm api-client:gen (package.json)
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
OUTPUT_DIR="packages/shared/src/api-client"

echo "Fetching OpenAPI spec from $API_URL/openapi.json..."
curl -sf "$API_URL/openapi.json" -o /tmp/openapi.json

echo "Generating TypeScript client..."
npx openapi-typescript /tmp/openapi.json -o "$OUTPUT_DIR/types.ts"

echo "Done: $OUTPUT_DIR/types.ts"
