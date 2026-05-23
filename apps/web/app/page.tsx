import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0a0a0f" }}>
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-green-500/30 text-green-400 bg-green-500/10">
            DPDP Act 2023 · GDPR · CCPA
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Compliance in{" "}
            <span style={{ color: "#63ffb5" }}>5 minutes.</span>
            <br />
            Not 5 months.
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            ShipComply scans your codebase, detects every PII flow, and generates a
            privacy policy, consent banner, and audit PDF — with file:line citations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-lg font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: "#63ffb5" }}
          >
            Get started free
          </Link>
          <Link
            href="/scans/demo"
            className="px-8 py-3 rounded-lg font-semibold border border-white/20 text-white hover:border-white/40 transition-colors"
          >
            Try demo scan
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
          {[
            { label: "PII flows detected", value: "100%" },
            { label: "Avg scan time", value: "<5 min" },
            { label: "Free tier", value: "Forever" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-2xl font-bold" style={{ color: "#63ffb5" }}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-600">
          AI-GENERATED ARTIFACTS ARE DRAFTS — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
        </p>
      </div>
    </main>
  );
}
