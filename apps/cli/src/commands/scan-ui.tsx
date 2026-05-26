import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";

interface ScanUIProps {
  target: string;
  offline: boolean;
  apiUrl: string;
  branch: string;
}

type Step = "starting" | "scanning" | "auditing" | "generating" | "done" | "error";

interface ScanSummary {
  total_elements: number;
  files_scanned: number;
  total_sources: number;
}

interface PolicySection {
  title: string;
  confidence: number;
  citations: string[];
}

interface AuditResult {
  score: number | null;
  score_label: string;
  findings_count: number;
}

function isLocalPath(target: string): boolean {
  return !target.startsWith("http://") && !target.startsWith("https://") && !target.startsWith("git@");
}

export function ScanUI({ target, offline, apiUrl, branch }: ScanUIProps) {
  const [step, setStep] = useState<Step>("starting");
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [topCitations, setTopCitations] = useState<string[]>([]);

  useEffect(() => {
    runScan();
  }, []);

  async function runScan() {
    try {
      setStep("scanning");
      const local = isLocalPath(target);

      if (local) {
        // Local path: call /scans/local directly
        const res = await fetch(`${apiUrl}/api/v1/scans/local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: target, offline }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
        const data = await res.json();
        setScanId(`local-${Date.now()}`);
        setSummary(data.scan as ScanSummary);

        // Step 2: audit
        setStep("auditing");
        const policyRes = await fetch(`${apiUrl}/api/v1/scans/local/policy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: target, jurisdiction: "DPDP" }),
        });
        if (policyRes.ok) {
          const policyData = await policyRes.json();
          const citations = (policyData.sections as PolicySection[])
            .flatMap((s) => s.citations)
            .slice(0, 5);
          setTopCitations(citations);
          const totalCitations: number = policyData.total_citations ?? 0;
          const sectionsCount: number = policyData.sections_count ?? 0;
          setAudit({
            score: null,
            score_label: `${sectionsCount} sections · ${totalCitations} citations`,
            findings_count: data.scan?.total_elements ?? 0,
          });
        }
      } else {
        // Remote URL: enqueue scan via POST /scans, then stream
        const res = await fetch(`${apiUrl}/api/v1/scans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_url: target, org_id: "cli", branch, offline }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setScanId(data.scan_id);
        setStep("auditing");

        await new Promise<void>((resolve) => {
          const es = new EventSource(`${apiUrl}/api/v1/scans/${data.scan_id}/stream`);
          es.onmessage = (e) => {
            const update = JSON.parse(e.data);
            if (update.done) { es.close(); resolve(); }
          };
          es.onerror = () => { es.close(); resolve(); };
          setTimeout(() => { es.close(); resolve(); }, 30_000);
        });
      }

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const stepLabel: Record<Step, string> = {
    starting:   "Starting...",
    scanning:   "Scanning files for PII elements...",
    auditing:   "Auditing compliance...",
    generating: "Generating artifacts...",
    done:       "Complete!",
    error:      "Failed",
  };

  if (step === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Scan failed: {error}</Text>
        {!offline && <Text dimColor>Try --offline flag if API is unreachable</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="#63ffb5">ShipComply</Text>
      <Text dimColor>Target: {target}</Text>
      {offline && <Text color="yellow">Offline mode (Ollama)</Text>}

      <Box marginTop={1} flexDirection="column">
        <Text color={step === "done" ? "green" : "cyan"}>{stepLabel[step]}</Text>
        {scanId && <Text dimColor>Scan: {scanId}</Text>}

        {summary && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Scan results:</Text>
            <Text>  Files scanned:      <Text color="cyan">{summary.files_scanned}</Text></Text>
            <Text>  PII elements found: <Text color={summary.total_elements > 0 ? "yellow" : "green"}>{summary.total_elements}</Text></Text>
            <Text>  Source references:  <Text color="cyan">{summary.total_sources}</Text></Text>
          </Box>
        )}

        {audit && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Policy generation:</Text>
            <Text>  {audit.score_label}</Text>
          </Box>
        )}

        {topCitations.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Top citations:</Text>
            {topCitations.map((c) => <Text key={c} dimColor>  {c}</Text>)}
          </Box>
        )}

        {step === "done" && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="green">Done! View your dashboard at:</Text>
            <Text color="cyan">  https://shipcomply.dev/scans/{scanId}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
