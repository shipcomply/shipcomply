#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SAMPLE="$ROOT/examples/sample-nextjs-app"
MONO="$ROOT/examples/sample-nextjs-monorepo"
echo "=== ShipComply Smoke Test ==="

run_scan() {
  python -c "
import sys, json
sys.path.insert(0, '$ROOT/services/api/src')
from shipcomply_api.scanner import scan_repo
r = scan_repo('$1')
print(json.dumps({'elements': [e.name for e in r.data_elements], 'count': len(r.data_elements), 'scanned': r.scanned_files}))
"
}

echo "> sample-nextjs-app"
R1=$(run_scan "$SAMPLE")
ELEMENTS=$(echo "$R1" | python -c "import sys,json; d=json.load(sys.stdin); print(' '.join(d['elements'])); assert d['count']>=5, f'Need >=5 types, got {d[\"count\"]}:{d[\"elements\"]}'")
echo "Detected: $ELEMENTS"

echo "> sample-nextjs-monorepo"
R2=$(run_scan "$MONO")
python -c "import sys,json; d=json.load(sys.stdin); assert 'email' in d['elements'], 'email not in monorepo scan'" <<< "$R2"

echo "> exclude test files"
python -c "
import sys
sys.path.insert(0, '$ROOT/services/api/src')
from shipcomply_api.scanner import _is_excluded
cases = [('src/a.test.tsx',True),('__mocks__/x.ts',True),('node_modules/y.ts',True),('app/page.tsx',False)]
for p,exp in cases:
    got = _is_excluded(p)
    assert got==exp, f'_is_excluded({p!r})={got}, want {exp}'
    print(f'PASS _is_excluded({p!r})={got}')
"

echo "=== Smoke tests PASSED ==="
