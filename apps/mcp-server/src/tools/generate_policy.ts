import { apiFetch } from "../client.js";

export const generate_policy = {
  spec: {
    name: "generate_policy",
    description:
      "Generate a PRIVACY.md policy document for a completed scan, with regulation citations. Returns the full Markdown text.",
    inputSchema: {
      type: "object",
      properties: {
        scan_id: { type: "string" },
        jurisdiction: {
          type: "string",
          enum: ["DPDP", "GDPR", "CCPA"],
          default: "DPDP",
          description: "Jurisdiction to generate the policy under",
        },
      },
      required: ["scan_id"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const jurisdiction = (args.jurisdiction as string | undefined) ?? "DPDP";
    const data = await apiFetch<{ markdown?: string; sections?: { title: string; body: string }[] }>(
      `/scans/${args.scan_id}/policy?jurisdiction=${jurisdiction}`
    );
    const md =
      data.markdown ??
      data.sections?.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n") ??
      "(No policy generated)";
    return { content: [{ type: "text", text: md }] };
  },
};
