import { apiFetch } from "../client.js";

export const check_file = {
  spec: {
    name: "check_file",
    description:
      "Fast single-file compliance check — no clone needed. Pass the file path and content; returns PII findings inline. Ideal for in-editor lint as you write code.",
    inputSchema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative or absolute file path (used for display only)" },
        content: { type: "string", description: "Full file content to scan" },
      },
      required: ["file_path", "content"],
    },
  },
  async handler(args: Record<string, unknown>) {
    const data = await apiFetch<{
      data_elements?: { element_type: string; field_name: string; sources: { file: string; line: number }[] }[];
    }>("/scans/local", {
      method: "POST",
      body: JSON.stringify({ path: args.file_path, content: args.content }),
    });
    const elements = data.data_elements ?? [];
    if (elements.length === 0) {
      return { content: [{ type: "text", text: `No PII detected in ${args.file_path}` }] };
    }
    const lines = elements.map((el) => {
      const locs = el.sources.map((s) => `${s.file}:${s.line}`).join(", ");
      return `• [${el.element_type.toUpperCase()}] ${el.field_name} at ${locs}`;
    });
    return {
      content: [{ type: "text", text: `${elements.length} PII element(s) in ${args.file_path}:\n\n${lines.join("\n")}` }],
    };
  },
};
