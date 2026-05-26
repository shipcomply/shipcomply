import { apiFetch } from "../client.js";

export const scan_repo = {
  spec: {
    name: "scan_repo",
    description:
      "Scan a local directory or GitHub URL for PII flows that trigger DPDP / GDPR / CCPA obligations. Returns a scan_id; use get_status to poll until ready, then list_findings for results.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute local path to scan (mutually exclusive with github_url)" },
        github_url: { type: "string", description: "GitHub repo URL to clone and scan" },
        jurisdiction: { type: "string", enum: ["DPDP", "GDPR", "CCPA"], default: "DPDP" },
      },
      anyOf: [{ required: ["path"] }, { required: ["github_url"] }],
    },
  },
  async handler(args: Record<string, unknown>) {
    const body = args.path
      ? { repo_url: args.path, jurisdiction: args.jurisdiction ?? "DPDP" }
      : { repo_url: args.github_url, jurisdiction: args.jurisdiction ?? "DPDP" };
    const data = await apiFetch<{ scan_id: string; status: string }>("/scans", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      content: [
        {
          type: "text",
          text: `Scan started. scan_id: ${data.scan_id}\nStatus: ${data.status}\nUse get_status("${data.scan_id}") to poll progress.`,
        },
      ],
    };
  },
};
