import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HOW_IT_WORKS = [
  { step: "01", title: "Connect your repo", desc: "Paste a GitHub URL or connect via our GitHub App. We never store your source code — only structured metadata." },
  { step: "02", title: "AST scan runs", desc: "Tree-sitter parses every TypeScript/JavaScript file. We detect PII field names, analytics sinks, ORM writes — with file:line citations." },
  { step: "03", title: "Artifacts generated", desc: "Privacy policy with legal citations. Working consent banner. Deletion/export API routes. Compliance score. Audit PDF. All in under 5 minutes." },
];

const FEATURES = [
  { title: "DPDP Act 2023 native", desc: "Built for India's data protection law. Every generated artifact maps to specific DPDP sections.", icon: "shield" },
  { title: "File:line citations", desc: "Not generic boilerplate. Your policy points to the exact code that collects each data element.", icon: "pin" },
  { title: "Working code output", desc: "Consent banner and API routes are copy-paste-ready TypeScript — not pseudocode.", icon: "bolt" },
  { title: "Knowledge graph", desc: "Interactive graph showing which PII flows trigger which obligations under which regulations.", icon: "graph" },
  { title: "LLM-powered guardrails", desc: "Every citation validated against DPDP knowledge graph. No hallucinated section references.", icon: "guard" },
  { title: "Audit PDF", desc: "Downloadable audit report with severity scoring, findings, remediation steps.", icon: "doc" },
];

const STATS = [
  { value: "100%", label: "Citation coverage" },
  { value: "<5 min", label: "Scan to artifacts" },
  { value: "DPDP + GDPR + CCPA", label: "Supported regulations" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-0">
      <Nav />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <Badge variant="mint">DPDP Act 2023</Badge>
            <Badge variant="default">GDPR</Badge>
            <Badge variant="default">CCPA</Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-bg-11 leading-[1.1] tracking-tight mb-6">
            Compliance in{" "}
            <span className="text-mint-9">5 minutes.</span>
            <br />Not 5 months.
          </h1>
          <p className="text-xl text-bg-8 max-w-2xl mx-auto mb-10 leading-relaxed">
            ShipComply scans your source code, detects every PII data flow via AST analysis, and generates a privacy policy with file:line citations, working consent banner, deletion endpoints, and audit PDF automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/sign-up"><Button size="lg">Get started free</Button></Link>
            <Link href="/dashboard"><Button variant="secondary" size="lg">Try demo scan</Button></Link>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-mint-9 mb-1">{s.value}</div>
                <div className="text-xs text-bg-7">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-bg-11 mb-3 text-center">How it works</h2>
          <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">Three steps from codebase to compliance artifacts.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-bg-2 border border-bg-5 rounded-xl p-6">
                <div className="text-4xl font-bold text-bg-5 font-mono mb-4">{s.step}</div>
                <h3 className="text-lg font-semibold text-bg-11 mb-2">{s.title}</h3>
                <p className="text-sm text-bg-8 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-bg-11 mb-3 text-center">Everything you need to ship compliant</h2>
          <p className="text-bg-8 text-center mb-12 max-w-xl mx-auto">No lawyers required for your first draft.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-bg-2 border border-bg-5 rounded-xl p-5 hover:border-bg-6 transition-colors">
                <h3 className="text-base font-semibold text-bg-11 mb-1.5">{f.title}</h3>
                <p className="text-sm text-bg-8 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-bg-11 mb-3">Works with your stack</h2>
          <p className="text-bg-8 mb-10 max-w-xl mx-auto">GitHub, GitLab, Bitbucket. TypeScript, JavaScript — more languages soon.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["GitHub", "GitLab", "Bitbucket", "Next.js", "React", "TypeScript", "Node.js"].map((name) => (
              <span key={name} className="px-4 py-2 rounded-lg bg-bg-3 border border-bg-5 text-sm text-bg-9 font-mono">{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-bg-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-bg-11 mb-4">Ready to ship compliant?</h2>
          <p className="text-bg-8 mb-8">Scan your first repo free. No credit card required.</p>
          <Link href="/sign-up"><Button size="lg" className="shadow-glow-md">Get started free</Button></Link>
          <p className="mt-4 text-xs text-bg-7">AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
