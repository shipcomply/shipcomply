import { apiFetch } from "../client.js";

interface Finding {
  severity: string;
  element_type?: string;
  title?: string;
  detail?: string;
  file_path?: string;
  line_number?: number;
  remediation?: string;
}

export const list_findings = {
  spec: {
    name: "list_findings",
    description: "List compliance findings for a completed scan, sorted HIGH → MEDIUM → LOW.",
    inputSchema: {
      type: "object",
      properties: {
        scan_id: { type: "string" },
        severity: {
          type: "string",
          enum: ["HIGH", "MEDIUM", "LOW"],
          description: "Filter to a specific severity level (optional)",
        },
      },
      required: ["scan_id"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const data = await apiFetch<{ findings?: Finding[]; score?: number }>(`/scans/${args.scan_id}/audit`);
    let findings = data.findings ?? [];
    if (args.severity) findings = findings.filter((f) => f.severity === args.severity);
    if (findings.length === 0) {
      return { content: [{ type: "text", text: "No findings (or scan still in progress)." }] };
    }
    const lines = findings.map((f, i) => {
      const loc = f.file_path ? ` — ${f.file_path}${f.line_number ? `:${f.line_number}` : ""}` : "";
      return `${i + 1}. [${f.severity}] ${f.title ?? f.element_type ?? "Finding"}${loc}\n   ${f.detail ?? f.remediation ?? ""}`;
    });
    return { content: [{ type: "text", text: `${findings.length} finding(s):\n\n${lines.join("\n\n")}` }] };
  },
};
