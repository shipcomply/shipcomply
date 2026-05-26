import { apiFetch } from "../client.js";

export const get_audit_md = {
  spec: {
    name: "get_audit_md",
    description: "Get the full Markdown audit report for a completed scan, including DPDP checklist and findings with file:line citations.",
    inputSchema: {
      type: "object",
      properties: {
        scan_id: { type: "string" },
      },
      required: ["scan_id"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const data = await apiFetch<{ audit_markdown?: string; score?: number; findings?: unknown[] }>(
      `/scans/${args.scan_id}/audit`
    );
    const md = data.audit_markdown ?? JSON.stringify(data, null, 2);
    return { content: [{ type: "text", text: md }] };
  },
};
