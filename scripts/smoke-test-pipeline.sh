#!/usr/bin/env bash
# Smoke test: scans sample-nextjs-app and asserts expected behaviour
# Called by: GitHub Actions CI (ci.yml)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLE="$ROOT/examples/sample-nextjs-app"
MONO="$ROOT/examples/sample-nextjs-monorepo"

echo "=== ShipComply Smoke Test ==="

# Test 1: Direct scan of sample app
echo "> Scanning sample-nextjs-app..."
RESULT=$(python -c "
import sys, json
sys.path.insert(0, '$ROOT/services/api/src')
from shipcomply_api.scanner import scan_repo
result = scan_repo('$SAMPLE')
print(json.dumps({'elements': [e.name for e in result.data_elements], 'scanned': result.scanned_files, 'excluded': result.excluded_files}))
")

ELEMENTS=$(echo "$RESULT" | python -c "import sys, json; d=json.load(sys.stdin); print(','.join(d['elements']))")
echo "Detected elements: $ELEMENTS"

if ! echo "$ELEMENTS" | grep -q "email"; then
  echo "FAIL: 'email' not detected in sample-nextjs-app"
  exit 1
fi
echo "PASS: email detected"

# Test 2: Monorepo scan
echo "> Scanning sample-nextjs-monorepo..."
RESULT2=$(python -c "
import sys, json
sys.path.insert(0, '$ROOT/services/api/src')
from shipcomply_api.scanner import scan_repo
result = scan_repo('$MONO')
print(json.dumps({'elements': [e.name for e in result.data_elements]}))
")
ELEMENTS2=$(echo "$RESULT2" | python -c "import sys, json; d=json.load(sys.stdin); print(','.join(d['elements']))")
echo "Monorepo elements: $ELEMENTS2"
if ! echo "$ELEMENTS2" | grep -q "email"; then
  echo "FAIL: 'email' not detected in monorepo sample"
  exit 1
fi
echo "PASS: monorepo email detected"

# Test 3: Test files should NOT trigger
TEST_RESULT=$(python -c "
import sys, json
sys.path.insert(0, '$ROOT/services/api/src')
from shipcomply_api.scanner import _is_excluded
tests = [
  ('src/signup.test.tsx', True),
  ('__mocks__/email.ts', True),
  ('node_modules/lib/index.ts', True),
  ('app/page.tsx', False),
  ('components/Form.tsx', False),
]
for path, expected in tests:
  result = _is_excluded(path)
  status = 'PASS' if result == expected else 'FAIL'
  print(f'{status}: _is_excluded({path!r}) = {result} (expected {expected})')
  if result != expected:
    sys.exit(1)
")
echo "$TEST_RESULT"

echo ""
echo "=== Smoke tests PASSED ==="
