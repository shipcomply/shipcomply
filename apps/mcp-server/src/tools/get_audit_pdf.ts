import { apiFetch } from "../client.js";

export const get_audit_pdf = {
  spec: {
    name: "get_audit_pdf",
    description: "Get the audit report as a base64-encoded PDF. Save it locally or attach to a PR description.",
    inputSchema: {
      type: "object",
      properties: {
        scan_id: { type: "string" },
      },
      required: ["scan_id"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const API_URL = process.env.SHIPCOMPLY_API_URL ?? "http://localhost:8000";
    const API_KEY = process.env.SHIPCOMPLY_API_KEY ?? "";
    const res = await fetch(`${API_URL}/api/v1/scans/${args.scan_id}/audit.pdf`, {
      headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    });
    if (!res.ok) {
      return { content: [{ type: "text", text: `PDF not available: ${res.statusText}` }], isError: true };
    }
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return {
      content: [
        { type: "text", text: `PDF ready (${(buf.byteLength / 1024).toFixed(1)} KB). Base64 below:` },
        { type: "text", text: b64 },
      ],
    };
  },
};
