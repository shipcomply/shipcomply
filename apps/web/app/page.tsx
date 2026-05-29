import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { WhatItDoesSection } from "@/components/marketing/what-it-does-section";
import { McpSection } from "@/components/marketing/mcp-section";
import { GitHubAppSection } from "@/components/marketing/github-app-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Zap, Network, ShieldCheck, FileText, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  shield: Shield,
  pin: MapPin,
  bolt: Zap,
  graph: Network,
  guard: ShieldCheck,
  doc: FileText,
};

const HOW_IT_WORKS = [
  { step: "01", title: "Connect your repo", desc: "Paste a GitHub URL or connect via our GitHub App. We never store your source code, only structured metadata." },
  { step: "02", title: "AST scan runs", desc: "Tree-sitter parses every TypeScript/JavaScript file. We detect PII field names, analytics sinks, ORM writes, with file:line citations." },
  { step: "03", title: "Artifacts generated", desc: "Privacy policy with legal citations. Working consent banner. Deletion/export API routes. Compliance score. Audit PDF. All in under 5 minutes." },
];

const FEATURES = [
  { title: "DPDP Act 2023 native", desc: "Built for India's data protection law. Every generated artifact maps to specific DPDP sections.", icon: "shield", span: "md:col-span-2" },
  { title: "File:line citations", desc: "Not generic boilerplate. Your policy points to the exact code that collects each data element.", icon: "pin", span: "" },
  { title: "Working code output", desc: "Consent banner and API routes are copy-paste-ready TypeScript, not pseudocode.", icon: "bolt", span: "" },
  { title: "Knowledge graph", desc: "Interactive graph showing which PII flows trigger which obligations under which regulations.", icon: "graph", span: "" },
  { title: "LLM-powered guardrails", desc: "Every citation validated against DPDP knowledge graph. No hallucinated section references.", icon: "guard", span: "" },
  { title: "Audit PDF", desc: "Downloadable audit report with severity scoring, findings, remediation steps.", icon: "doc", span: "", download: true },
];

const STATS = [
  { value: "100%", label: "Citation coverage" },
  { value: "<5 min", label: "Scan to artifacts" },
  { value: "DPDP + GDPR + CCPA", label: "Supported regulations" },
];

const CLI_COMMANDS = [
  { cmd: "npx shipcomply scan https://github.com/your/repo", desc: "Scan any public repo" },
  { cmd: "npx shipcomply report --format pdf", desc: "Export audit as PDF" },
  { cmd: "npx shipcomply policy --jurisdiction DPDP", desc: "Generate privacy policy" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-0">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <Badge variant="mint">DPDP Act 2023</Badge>
            <Badge variant="default">GDPR</Badge>
            <Badge variant="default">CCPA</Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-bg-11 leading-[1.08] tracking-tight mb-6">
            Compliance in{" "}
            <span className="text-mint-9">5 minutes.</span>
            <br />Not 5 months.
          </h1>
          <p className="text-xl text-bg-8 max-w-2xl mx-auto mb-10 leading-relaxed">
            ShipComply scans your source code, detects every PII data flow via AST analysis, and generates a privacy policy with file:line citations, working consent banner, deletion endpoints, and audit PDF automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/signup"><Button size="lg">Get started free</Button></Link>
            <Link href="/signup?redirect_url=/dashboard"><Button variant="secondary" size="lg">Try demo scan</Button></Link>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`font-bold text-mint-9 mb-1 ${s.value.length >= 12 ? "text-base" : "text-2xl"}`}>{s.value}</div>
                <div className="text-xs text-bg-7">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it does */}
      <WhatItDoesSection />

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-bg-11 mb-3 text-center">How it works</h2>
          <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">Three steps from codebase to compliance artifacts.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-bg-2 border border-bg-4 rounded-xl p-6 hover:border-bg-5 transition-colors">
                <div className="text-3xl font-bold text-mint-9/25 font-mono mb-4 tabular-nums">{s.step}</div>
                <h3 className="text-base font-semibold text-bg-11 mb-2">{s.title}</h3>
                <p className="text-sm text-bg-8 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-bg-11 mb-3 text-center">Everything you need to ship compliant</h2>
          <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">No lawyers required for your first draft.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = ICON_MAP[f.icon];
              return (
                <div key={f.title} className={`bg-bg-2 border border-bg-4 rounded-xl p-5 hover:border-bg-5 transition-colors flex flex-col ${f.span ?? ""}`}>
                  {Icon && <Icon size={16} className="text-mint-9 mb-3 flex-shrink-0" />}
                  <h3 className={`font-semibold text-bg-11 mb-1.5 ${f.span ? "text-lg" : "text-sm"}`}>{f.title}</h3>
                  <p className="text-sm text-bg-8 leading-relaxed flex-1">{f.desc}</p>
                  {f.download && (
                    <Link href="/signup" className="mt-3 text-xs text-mint-9 hover:text-mint-11 transition-colors">
                      Download sample report →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MCP */}
      <McpSection />

      {/* GitHub App */}
      <GitHubAppSection />

      {/* CLI */}
      <section id="cli" className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-3xl font-bold text-bg-11">Run from your terminal</h2>
            <Badge variant="default" className="font-mono">CLI</Badge>
          </div>
          <p className="text-bg-8 mb-10 max-w-xl">
            One command. No account required for your first scan. Integrates with any CI pipeline.
          </p>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              {CLI_COMMANDS.map((c) => (
                <div key={c.cmd} className="flex gap-4 items-start py-2.5 border-b border-bg-4 last:border-0">
                  <Terminal size={13} className="text-mint-9 flex-shrink-0 mt-1" />
                  <div>
                    <code className="text-xs font-mono text-bg-10 block mb-0.5">{c.cmd}</code>
                    <p className="text-xs text-bg-7">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-bg-2 border border-bg-4 rounded-xl p-5">
              <p className="text-xs font-mono text-bg-7 mb-3">Install</p>
              <pre className="text-sm font-mono text-mint-9 bg-bg-3 border border-bg-5 rounded-lg px-4 py-3">
                npx shipcomply@latest
              </pre>
              <p className="text-xs text-bg-7 mt-3 leading-relaxed">
                Works on Node 18+. No global install needed. API key optional for public repos.
              </p>
              <a
                href="https://www.npmjs.com/package/shipcomply"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-xs text-mint-9 hover:text-mint-11 transition-colors"
              >
                View on npm →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stack chips */}
      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-bg-11 mb-3">Works with your stack</h2>
          <p className="text-bg-8 mb-10 max-w-xl mx-auto">GitHub, GitLab, Bitbucket. TypeScript, JavaScript. More languages soon.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["GitHub", "GitLab", "Bitbucket", "Next.js", "React", "TypeScript", "Node.js"].map((name) => (
              <span key={name} className="px-4 py-2 rounded-lg bg-bg-2 border border-bg-4 text-sm text-bg-9 font-mono hover:border-bg-5 hover:text-bg-11 transition-colors">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-bg-11 mb-4">Ready to ship compliant?</h2>
          <p className="text-bg-8 mb-8">Scan your first repo free. No credit card required.</p>
          <Link href="/signup"><Button size="lg" className="shadow-glow-md">Get started free</Button></Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
