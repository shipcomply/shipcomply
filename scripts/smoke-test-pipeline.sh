#!/usr/bin/env bash
# smoke-test-pipeline.sh — full end-to-end pipeline smoke test
# Runs against examples/sample-nextjs-app without network (OFFLINE=true)
# Called by CI and pnpm scan:sample
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
SAMPLE_PATH="examples/sample-nextjs-app"
PASS=0
FAIL=0

ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "=== ShipComply Smoke Test ==="
echo "Target: $SAMPLE_PATH"
echo ""

# 1. Scanner: >=5 data elements
echo "[1] Scanner — data elements"
ELEMENTS=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
r = scan_repo('$SAMPLE_PATH')
print(len(r.data_elements))
")
if [ "$ELEMENTS" -ge 5 ]; then
  ok "Found $ELEMENTS PII elements (>=5)"
else
  fail "Only $ELEMENTS PII elements (need >=5)"
fi

# 2. Scanner: no test files in results
echo "[2] Scanner — test file exclusion"
TEST_LEAK=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
r = scan_repo('$SAMPLE_PATH')
leaks = [src.file for el in r.data_elements for src in el.sources if '.test.' in src.file or '.spec.' in src.file]
print(len(leaks))
")
if [ "$TEST_LEAK" -eq 0 ]; then
  ok "No test files in scan results"
else
  fail "$TEST_LEAK test file(s) leaked into results"
fi

# 3. Knowledge Graph: has nodes and edges
echo "[3] Knowledge Graph — nodes + edges"
KG=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
from shipcomply_api.scanner.knowledge_graph import build_graph
r = scan_repo('$SAMPLE_PATH')
g = build_graph(r)
print(len(g.nodes), len(g.edges))
")
KG_NODES=$(echo $KG | cut -d' ' -f1)
KG_EDGES=$(echo $KG | cut -d' ' -f2)
if [ "$KG_NODES" -gt 0 ] && [ "$KG_EDGES" -gt 0 ]; then
  ok "KG: $KG_NODES nodes, $KG_EDGES edges"
else
  fail "KG empty: $KG_NODES nodes, $KG_EDGES edges"
fi

# 4. Legal Writer: >=3 citations, disclaimer present
echo "[4] Legal Writer — citations + disclaimer"
POLICY=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
from shipcomply_api.legal_writer import PolicyGenerator
r = scan_repo('$SAMPLE_PATH')
p = PolicyGenerator().generate(r, jurisdiction='DPDP')
total = sum(len(s.citations) for s in p.sections)
md = p.to_markdown()
has_disc = 'AI-GENERATED DRAFT' in md
print(total, has_disc)
")
CITES=$(echo $POLICY | cut -d' ' -f1)
DISC=$(echo $POLICY | cut -d' ' -f2)
if [ "$CITES" -ge 3 ]; then
  ok "Policy: $CITES citations (>=3)"
else
  fail "Policy: only $CITES citations (need >=3)"
fi
if [ "$DISC" = "True" ]; then
  ok "Policy: disclaimer present"
else
  fail "Policy: disclaimer MISSING"
fi

# 5. Code Generator: 3 files, all have managed marker
echo "[5] Code Generator — 3 files + managed markers"
CODEGEN=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
from shipcomply_api.code_gen import CodeGenerator
r = scan_repo('$SAMPLE_PATH')
result = CodeGenerator().generate(r)
all_marked = all('shipcomply-managed' in f.content for f in result.files)
print(len(result.files), all_marked)
")
FILES=$(echo $CODEGEN | cut -d' ' -f1)
MARKED=$(echo $CODEGEN | cut -d' ' -f2)
if [ "$FILES" -eq 3 ]; then
  ok "CodeGen: $FILES files generated"
else
  fail "CodeGen: $FILES files (expected 3)"
fi
if [ "$MARKED" = "True" ]; then
  ok "CodeGen: all files have managed marker"
else
  fail "CodeGen: some files missing managed marker"
fi

# 6. Audit: score in 0-100 or None, disclaimer present
echo "[6] Audit Agent — score + disclaimer"
AUDIT=$(python -c "
import sys; sys.path.insert(0,'services/api/src')
from shipcomply_api.scanner import scan_repo
from shipcomply_api.audit import AuditAgent
r = scan_repo('$SAMPLE_PATH')
report = AuditAgent().audit(r)
score_ok = report.score is None or (0 <= report.score <= 100)
has_disc = 'AI-GENERATED DRAFT' in report.to_markdown()
print(score_ok, has_disc, report.score)
")
SCORE_OK=$(echo $AUDIT | cut -d' ' -f1)
AUDIT_DISC=$(echo $AUDIT | cut -d' ' -f2)
SCORE_VAL=$(echo $AUDIT | cut -d' ' -f3)
if [ "$SCORE_OK" = "True" ]; then
  ok "Audit: score=$SCORE_VAL (valid)"
else
  fail "Audit: score out of range"
fi
if [ "$AUDIT_DISC" = "True" ]; then
  ok "Audit: disclaimer present"
else
  fail "Audit: disclaimer MISSING"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
