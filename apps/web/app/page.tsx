import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { WhatItDoesSection } from "@/components/marketing/what-it-does-section";
import { McpSection } from "@/components/marketing/mcp-section";
import { GitHubAppSection } from "@/components/marketing/github-app-section";
import { Reveal } from "@/components/ui/reveal";
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
  { title: "LLM-powered guardrails", desc: "Every citation validated against the DPDP knowledge graph. No hallucinated section references.", icon: "guard", span: "" },
  { title: "Audit PDF", desc: "Downloadable audit report with severity scoring, findings, remediation steps.", icon: "doc", span: "", download: true },
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

      <Hero />

      {/* What it does */}
      <WhatItDoesSection />

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-bg-11 mb-3 text-center tracking-tight">How it works</h2>
            <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">Three steps from codebase to compliance artifacts.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.08}>
                <div className="h-full bg-bg-2 border border-bg-4 rounded-xl p-6 hover:border-bg-6 hover:-translate-y-0.5 transition-[transform,border-color] duration-base ease-out-cubic">
                  <div className="text-3xl font-bold text-mint-9/25 font-mono mb-4 tabular-nums">{s.step}</div>
                  <h3 className="text-base font-semibold text-bg-11 mb-2">{s.title}</h3>
                  <p className="text-sm text-bg-8 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-bg-11 mb-3 text-center tracking-tight">Everything you need to ship compliant</h2>
            <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">No lawyers required for your first draft.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = ICON_MAP[f.icon];
              return (
                <Reveal key={f.title} delay={i * 0.06} className={f.span}>
                  <div className="h-full bg-bg-2 border border-bg-4 rounded-xl p-5 hover:border-bg-6 hover:-translate-y-0.5 transition-[transform,border-color] duration-base ease-out-cubic flex flex-col">
                    {Icon && <Icon size={16} className="text-mint-9 mb-3 flex-shrink-0" />}
                    <h3 className={`font-semibold text-bg-11 mb-1.5 ${f.span ? "text-lg" : "text-sm"}`}>{f.title}</h3>
                    <p className="text-sm text-bg-8 leading-relaxed flex-1">{f.desc}</p>
                    {f.download && (
                      <Link href="/signup" className="mt-3 text-xs text-mint-9 hover:text-mint-11 transition-colors">
                        Download sample report →
                      </Link>
                    )}
                  </div>
                </Reveal>
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
          <Reveal>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-display text-3xl font-bold text-bg-11 tracking-tight">Run from your terminal</h2>
              <Badge variant="default" className="font-mono">CLI</Badge>
            </div>
            <p className="text-bg-8 mb-10 max-w-xl">
              One command. No account required for your first scan. Integrates with any CI pipeline.
            </p>
          </Reveal>
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
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-bg-11 mb-3 tracking-tight">Works with your stack</h2>
            <p className="text-bg-8 mb-10 max-w-xl mx-auto">GitHub, GitLab, Bitbucket. TypeScript, JavaScript. More languages soon.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["GitHub", "GitLab", "Bitbucket", "Next.js", "React", "TypeScript", "Node.js"].map((name) => (
                <span key={name} className="px-4 py-2 rounded-lg bg-bg-2 border border-bg-4 text-sm text-bg-9 font-mono hover:border-bg-6 hover:text-bg-11 transition-colors">{name}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-bg-4">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-bg-11 mb-4 tracking-tight">Ready to ship compliant?</h2>
          <p className="text-bg-8 mb-8">Scan your first repo free. No credit card required.</p>
          <Link href="/signup"><Button size="lg" className="shadow-glow-md">Get started free</Button></Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
