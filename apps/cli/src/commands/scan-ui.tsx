import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";

interface ScanUIProps {
  target: string;
  offline: boolean;
  apiUrl: string;
  branch: string;
}

type Step = "starting" | "scanning" | "analyzing" | "generating" | "done" | "error";

export function ScanUI({ target, offline, apiUrl, branch }: ScanUIProps) {
  const [step, setStep] = useState<Step>("starting");
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elements, setElements] = useState<string[]>([]);

  useEffect(() => {
    runScan();
  }, []);

  async function runScan() {
    try {
      setStep("scanning");

      const response = await fetch(`${apiUrl}/api/v1/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: target, org_id: "cli", branch, offline }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setScanId(data.scan_id);
      setStep("analyzing");

      // Stream SSE updates
      const es = new EventSource(`${apiUrl}/api/v1/scans/${data.scan_id}/stream`);
      es.onmessage = (e) => {
        const update = JSON.parse(e.data);
        if (update.done) {
          es.close();
          setStep("done");
        }
        if (update.elements) setElements(update.elements);
      };
      es.onerror = () => {
        es.close();
        setStep("done");
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  if (step === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Scan failed: {error}</Text>
        {offline ? null : <Text dimColor>Try --offline mode if API is unreachable</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="#63ffb5">ShipComply</Text>
      <Text dimColor>Target: {target}</Text>
      {offline && <Text color="yellow">Offline mode</Text>}
      <Box marginTop={1} flexDirection="column">
        <Text>{step === "starting" ? "Starting..." : step === "scanning" ? "Scanning files..." : step === "analyzing" ? "Analyzing PII flows..." : step === "generating" ? "Generating artifacts..." : "Done!"}</Text>
        {scanId && <Text dimColor>Scan ID: {scanId}</Text>}
        {elements.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Data elements found:</Text>
            {elements.map((el) => <Text key={el} color="cyan">  • {el}</Text>)}
          </Box>
        )}
      </Box>
    </Box>
  );
}
