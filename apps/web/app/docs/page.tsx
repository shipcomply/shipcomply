import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GITHUB_APP_URL } from "@/lib/constants";
import { Terminal, Zap, GitPullRequest, Code2, BookOpen, Shield, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "ShipComply documentation: quick start, CLI reference, MCP integration, GitHub App, and REST API.",
};

const TOC = [
  { id: "quick-start",   label: "Quick Start" },
  { id: "how-it-works",  label: "How it works" },
  { id: "cli",           label: "CLI" },
  { id: "mcp",           label: "MCP Integration" },
  { id: "github-app",    label: "GitHub App" },
  { id: "api",           label: "REST API" },
  { id: "jurisdictions", label: "Jurisdictions" },
  { id: "legal",         label: "Legal Notice" },
];

const API_ENDPOINTS = [
  { method: "POST",  path: "/api/v1/scans",          auth: true,  desc: "Start a new compliance scan" },
  { method: "GET",   path: "/api/v1/scans",          auth: true,  desc: "List all scans for your account" },
  { method: "GET",   path: "/api/v1/scans/{id}",     auth: true,  desc: "Get scan status, findings, and metadata" },
  { method: "GET",   path: "/api/v1/scans/{id}/audit",  auth: true, desc: "Get full audit report (markdown)" },
  { method: "GET",   path: "/api/v1/scans/{id}/policy", auth: true, desc: "Get generated privacy policy" },
  { method: "GET",   path: "/api/v1/scans/{id}/graph",  auth: true, desc: "Get knowledge graph JSON" },
  { method: "GET",   path: "/api/v1/corpus/status",  auth: false, desc: "Legal corpus health: loaded count + jurisdictions" },
  { method: "GET",   path: "/healthz",               auth: false, desc: "Service health check" },
];

const MCP_TOOLS = [
  { name: "scan_repo",       desc: "Trigger a full compliance scan on any public repo URL" },
  { name: "list_findings",   desc: "Return all findings with severity, file:line, and rule ID" },
  { name: "generate_policy", desc: "Generate or regenerate the privacy policy markdown" },
  { name: "get_audit_md",    desc: "Download the full audit report as markdown" },
  { name: "get_audit_pdf",   desc: "Retrieve the audit PDF artifact URL" },
  { name: "check_file",      desc: "Check a single file path for PII data flows" },
  { name: "get_status",      desc: "Poll scan status and per-agent pipeline progress" },
];

const JURISDICTIONS = [
  {
    name: "DPDP Act 2023",
    region: "India",
    key: "DPDP",
    icon: Shield,
    desc: "India's Digital Personal Data Protection Act. Applies to any entity processing personal data of Indian residents, regardless of where processing occurs.",
  },
  {
    name: "GDPR",
    region: "European Union",
    key: "GDPR",
    icon: Globe,
    desc: "General Data Protection Regulation. Extraterritorial: applies if you offer goods/services to EU residents or monitor their behavior.",
  },
  {
    name: "CCPA / CPRA",
    region: "California, USA",
    key: "CCPA",
    icon: Shield,
    desc: "California Consumer Privacy Act and its 2020 amendment. Applies to for-profit businesses meeting revenue or data volume thresholds.",
  },
];

function SectionHeading({ id, icon: Icon, children }: { id: string; icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-xl font-bold text-bg-11 mb-5 mt-12 first:mt-0 scroll-mt-24 group">
      {Icon && <Icon size={18} className="text-mint-9 flex-shrink-0" />}
      <a href={`#${id}`} className="hover:text-mint-9 transition-colors">{children}</a>
    </h2>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-bg-4 mb-4">
      {label && (
        <div className="px-4 py-2 bg-bg-3 border-b border-bg-4 text-xs font-mono text-bg-7">{label}</div>
      )}
      <pre className="p-4 bg-bg-2 overflow-x-auto text-sm font-mono text-bg-9 leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="w-7 h-7 rounded-full bg-mint-9/15 border border-mint-9/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-bold text-mint-9 tabular-nums">{n}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-bg-11 mb-1">{title}</p>
        <div className="text-sm text-bg-8 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

const METHOD_COLOR: Record<string, string> = {
  GET:  "text-info bg-info/10 border-info/25",
  POST: "text-mint-9 bg-mint-9/10 border-mint-9/25",
  PATCH: "text-warning bg-warning/10 border-warning/25",
  DELETE: "text-danger bg-danger/10 border-danger/25",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg-0">
      <Nav />

      <div className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-mint-9" />
              <span className="text-xs font-semibold uppercase tracking-widest text-bg-7">Documentation</span>
            </div>
            <h1 className="text-4xl font-bold text-bg-11 mb-3">ShipComply Docs</h1>
            <p className="text-bg-8 text-lg max-w-2xl leading-relaxed">
              Everything you need to scan repos, generate compliance artifacts, and integrate ShipComply into your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-[200px_1fr] gap-12">

            {/* Sidebar TOC */}
            <aside className="hidden md:block">
              <nav className="sticky top-24 space-y-0.5" aria-label="Documentation sections">
                <p className="text-xs font-semibold uppercase tracking-widest text-bg-6 mb-3 px-3">On this page</p>
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block px-3 py-1.5 rounded-md text-sm text-bg-8 hover:text-bg-11 hover:bg-bg-3 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-6 pt-4 border-t border-bg-4">
                  <Link href="/signup">
                    <Button size="sm" className="w-full text-xs">Get started free</Button>
                  </Link>
                </div>
              </nav>
            </aside>

            {/* Main content */}
            <article className="min-w-0 prose-none">

              {/* Quick Start */}
              <SectionHeading id="quick-start" icon={Zap}>Quick Start</SectionHeading>
              <p className="text-bg-8 text-sm leading-relaxed mb-6">
                From signup to your first compliance report in under 5 minutes. No local setup required.
              </p>
              <Step n={1} title="Create an account">
                <Link href="/signup" className="text-mint-9 hover:text-mint-11 transition-colors">Sign up</Link> with your email or GitHub account.
                You&apos;ll land on the dashboard after signup.
              </Step>
              <Step n={2} title="Start a scan">
                Click <strong className="text-bg-11">New scan</strong> in the sidebar. Paste any public GitHub, GitLab, or Bitbucket URL.
                Select your jurisdiction (DPDP, GDPR, or CCPA) and click <strong className="text-bg-11">Start scan</strong>.
              </Step>
              <Step n={3} title="Wait for analysis">
                The pipeline runs in under 5 minutes for most repos (cold start on free tier can add ~50s on first request).
                Watch the status update in real time on the scan detail page.
              </Step>
              <Step n={4} title="Download your artifacts">
                Once completed: download the audit PDF, copy the privacy policy markdown, and grab the consent banner code.
                Every finding includes a file:line citation you can verify directly.
              </Step>

              {/* How it works */}
              <SectionHeading id="how-it-works" icon={Code2}>How it works</SectionHeading>
              <p className="text-bg-8 text-sm leading-relaxed mb-4">
                ShipComply never stores your source code. The scanner clones your repo to an ephemeral container, extracts structured metadata (field names, file paths, line numbers, data sinks), then discards the clone. Only the structured metadata is persisted.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  { title: "AST detection", body: "Tree-sitter parses TypeScript/JavaScript. PII field names, analytics sinks, ORM writes are detected via pattern rules, not LLMs." },
                  { title: "Knowledge graph", body: "A DPDP legal graph maps detected data elements to specific Act sections, obligations, and legal bases. No hallucinated citations." },
                  { title: "LLM artifact generation", body: "GPT/Gemini/Groq generate the policy text and code from structured inputs. Temperature=0 for deterministic output. Responses cached 24h." },
                  { title: "Guardrail validation", body: "Before delivery: every citation is cross-checked against the knowledge graph. No uncited section references pass through." },
                ].map((c) => (
                  <div key={c.title} className="p-4 rounded-xl bg-bg-2 border border-bg-4">
                    <p className="text-sm font-semibold text-bg-11 mb-1">{c.title}</p>
                    <p className="text-xs text-bg-7 leading-relaxed">{c.body}</p>
                  </div>
                ))}
              </div>

              {/* CLI */}
              <SectionHeading id="cli" icon={Terminal}>CLI</SectionHeading>
              <p className="text-bg-8 text-sm leading-relaxed mb-4">
                Run scans from your terminal without opening a browser. No global install required.
              </p>
              <CodeBlock label="Install">npx shipcomply@latest</CodeBlock>
              <CodeBlock label="Commands">
{`npx shipcomply scan https://github.com/org/repo      # scan a repo
npx shipcomply scan <url> --jurisdiction GDPR         # specify jurisdiction
npx shipcomply status <scan-id>                       # poll scan status
npx shipcomply report <scan-id> --format pdf          # download audit PDF
npx shipcomply policy <scan-id>                       # print privacy policy
npx shipcomply auth login                             # authenticate with API key`}
              </CodeBlock>
              <p className="text-xs text-bg-7 mt-2 mb-4">
                API key optional for public repos. Set <code className="text-bg-9 bg-bg-3 px-1.5 py-0.5 rounded text-xs font-mono">SHIPCOMPLY_API_KEY</code> env var or run <code className="text-bg-9 bg-bg-3 px-1.5 py-0.5 rounded text-xs font-mono">shipcomply auth login</code>.
              </p>

              {/* MCP */}
              <SectionHeading id="mcp">MCP Integration</SectionHeading>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="mint">Claude Desktop</Badge>
                <Badge variant="default">Cursor</Badge>
                <Badge variant="default">Codex</Badge>
                <Badge variant="default">Any MCP client</Badge>
              </div>
              <p className="text-bg-8 text-sm leading-relaxed mb-4">
                Add ShipComply as an MCP server. Seven tools available immediately in any compatible AI assistant.
              </p>
              <CodeBlock label="~/.config/claude/mcp.json (or cursor settings)">
{`{
  "mcpServers": {
    "shipcomply": {
      "command": "npx",
      "args": ["-y", "shipcomply-mcp-server"],
      "env": {
        "SHIPCOMPLY_API_KEY": "<your-api-key>"
      }
    }
  }
}`}
              </CodeBlock>
              <div className="space-y-2 mb-4">
                {MCP_TOOLS.map((t) => (
                  <div key={t.name} className="flex gap-3 items-start py-2 border-b border-bg-4 last:border-0">
                    <code className="text-xs font-mono text-mint-9 bg-mint-9/8 border border-mint-9/20 rounded px-2 py-0.5 flex-shrink-0 mt-0.5 whitespace-nowrap">
                      {t.name}
                    </code>
                    <p className="text-sm text-bg-7">{t.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-bg-7">
                Get your API key from <Link href="/settings" className="text-mint-9 hover:text-mint-11 transition-colors">Settings</Link>.
              </p>

              {/* GitHub App */}
              <SectionHeading id="github-app" icon={GitPullRequest}>GitHub App</SectionHeading>
              <p className="text-bg-8 text-sm leading-relaxed mb-4">
                Install once on your GitHub org. Every pull request automatically gets a compliance check: a findings comment with file:line citations and a pass/fail commit status.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm">
                {[
                  { title: "Automatic trigger", body: "No config per repo. Opens a PR, scan starts." },
                  { title: "Findings comment", body: "Each HIGH/MEDIUM/LOW finding posted as a PR comment with exact file:line." },
                  { title: "Block on HIGH", body: "Commit status set to failure when HIGH severity findings are present. Configure threshold per org." },
                ].map((f) => (
                  <div key={f.title} className="p-4 rounded-xl bg-bg-2 border border-bg-4">
                    <p className="text-sm font-semibold text-bg-11 mb-1">{f.title}</p>
                    <p className="text-xs text-bg-7 leading-relaxed">{f.body}</p>
                  </div>
                ))}
              </div>
              <Link href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">Install GitHub App →</Button>
              </Link>

              {/* REST API */}
              <SectionHeading id="api">REST API</SectionHeading>
              <p className="text-bg-8 text-sm leading-relaxed mb-2">
                Base URL: <code className="text-bg-9 bg-bg-3 px-1.5 py-0.5 rounded text-xs font-mono">https://shipcomply-api.onrender.com</code>
              </p>
              <p className="text-bg-8 text-sm leading-relaxed mb-4">
                Authenticated endpoints require <code className="text-bg-9 bg-bg-3 px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer &lt;clerk-session-token&gt;</code>.
              </p>
              <div className="rounded-xl border border-bg-4 overflow-hidden mb-4">
                <div className="grid grid-cols-[90px_1fr_60px] px-4 py-2 bg-bg-3 border-b border-bg-4 text-xs font-semibold uppercase tracking-wider text-bg-6">
                  <span>Method</span>
                  <span>Path</span>
                  <span className="text-right">Auth</span>
                </div>
                {API_ENDPOINTS.map((ep) => (
                  <div key={ep.path + ep.method} className="grid grid-cols-[90px_1fr_60px] px-4 py-3 border-b border-bg-4 last:border-0 items-start gap-2">
                    <span className={`text-xs font-mono font-semibold border rounded px-1.5 py-0.5 inline-block w-fit ${METHOD_COLOR[ep.method]}`}>
                      {ep.method}
                    </span>
                    <div>
                      <code className="text-xs font-mono text-bg-10 block">{ep.path}</code>
                      <p className="text-xs text-bg-7 mt-0.5">{ep.desc}</p>
                    </div>
                    <span className="text-right text-xs text-bg-7">{ep.auth ? "Yes" : "No"}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-bg-7 mb-2">Example: start a scan</p>
              <CodeBlock>
{`curl -X POST https://shipcomply-api.onrender.com/api/v1/scans \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/org/repo", "jurisdiction": "DPDP"}'`}
              </CodeBlock>

              {/* Jurisdictions */}
              <SectionHeading id="jurisdictions" icon={Globe}>Jurisdictions</SectionHeading>
              <div className="space-y-4 mb-4">
                {JURISDICTIONS.map((j) => {
                  const Icon = j.icon;
                  return (
                    <div key={j.key} className="flex gap-4 p-4 rounded-xl bg-bg-2 border border-bg-4">
                      <div className="w-8 h-8 rounded-lg bg-mint-9/10 border border-mint-9/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={14} className="text-mint-9" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-bg-11">{j.name}</p>
                          <span className="text-xs text-bg-7 font-mono bg-bg-3 border border-bg-5 px-1.5 py-0.5 rounded">{j.key}</span>
                          <span className="text-xs text-bg-6">{j.region}</span>
                        </div>
                        <p className="text-sm text-bg-8 leading-relaxed">{j.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legal */}
              <SectionHeading id="legal">Legal Notice</SectionHeading>
              <div className="p-4 rounded-xl bg-warning/8 border border-warning/25 text-sm text-warning leading-relaxed">
                {/* AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING */}
                All artifacts generated by ShipComply (privacy policies, consent banners, audit reports, code) are AI-generated drafts. They must be reviewed by a qualified attorney before publishing or relying on them in a legal context. ShipComply is a compliance workflow tool, not a law firm.
              </div>

            </article>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
