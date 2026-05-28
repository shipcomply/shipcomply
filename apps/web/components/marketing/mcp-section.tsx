import { Badge } from "@/components/ui/badge";

const MCP_TOOLS = [
  { name: "scan_repo",       desc: "Trigger a full compliance scan on any public repo URL" },
  { name: "list_findings",   desc: "Get all findings with severity and file:line citations" },
  { name: "generate_policy", desc: "Generate or regenerate the privacy policy markdown" },
  { name: "get_audit_md",    desc: "Download the full audit report as markdown" },
  { name: "get_audit_pdf",   desc: "Retrieve the audit PDF artifact URL" },
  { name: "check_file",      desc: "Check a single file path for PII data flows" },
  { name: "get_status",      desc: "Poll scan status and pipeline progress" },
];

const MCP_CONFIG = `{
  "mcpServers": {
    "shipcomply": {
      "command": "npx",
      "args": ["-y", "shipcomply-mcp-server"],
      "env": {
        "SHIPCOMPLY_API_KEY": "<your-api-key>"
      }
    }
  }
}`;

export function McpSection() {
  return (
    <section className="py-20 px-6 border-t border-bg-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-3xl font-bold text-bg-11">Works from Claude, Cursor, Codex</h2>
          <Badge variant="mint">MCP</Badge>
        </div>
        <p className="text-bg-8 mb-10 max-w-xl">
          One npx command, seven tools. Run a compliance scan without leaving your editor.
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <p className="text-xs font-mono text-bg-7 mb-2">~/.config/claude/mcp.json</p>
            <pre className="text-xs font-mono bg-bg-2 border border-bg-5 rounded-xl p-4 overflow-x-auto text-bg-9 leading-relaxed whitespace-pre">
              {MCP_CONFIG}
            </pre>
            <p className="text-xs text-bg-6 mt-3">
              Then ask Claude: &ldquo;use shipcomply to scan github.com/vercel/next.js&rdquo;
            </p>
          </div>
          <div className="space-y-2">
            {MCP_TOOLS.map((t) => (
              <div key={t.name} className="flex gap-3 items-start py-2">
                <code className="text-xs font-mono text-mint-9 bg-mint-9/8 border border-mint-9/20 rounded px-2 py-0.5 flex-shrink-0 mt-0.5">
                  {t.name}
                </code>
                <p className="text-sm text-bg-7">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
