import { apiFetch } from "../client.js";

export const get_status = {
  spec: {
    name: "get_status",
    description: "Poll the status of a scan. Call repeatedly until status is 'completed' or 'failed'.",
    inputSchema: {
      type: "object",
      properties: {
        scan_id: { type: "string", description: "Scan ID returned by scan_repo" },
      },
      required: ["scan_id"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const data = await apiFetch<{
      scan_id: string;
      status: string;
      compliance_score: number | null;
      files_scanned: number | null;
    }>(`/scans/${args.scan_id}`);
    const score = data.compliance_score !== null ? `${data.compliance_score}/100` : "pending";
    return {
      content: [
        {
          type: "text",
          text: `scan_id: ${data.scan_id}\nstatus: ${data.status}\nscore: ${score}\nfiles_scanned: ${data.files_scanned ?? "—"}`,
        },
      ],
    };
  },
};
