"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Plus, ArrowRight, FileText, ShieldCheck, Code2, FileCheck2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiStateBanner, useApiState } from "@/components/ui/api-state";
import { api } from "@/lib/api";

interface ScanRow {
  scan_id: string;
  status: string;
  repo_url: string;
  jurisdiction: string;
  compliance_score: number | null;
  files_scanned: number | null;
  started_at: string | null;
}

const EXAMPLE_REPOS = [
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "supabase/supabase", url: "https://github.com/supabase/supabase" },
  { label: "calcom/cal.com", url: "https://github.com/calcom/cal.com" },
];

const STEPS = [
  { n: "1", title: "Paste a repo URL", desc: "Any public GitHub, GitLab, or Bitbucket repository." },
  { n: "2", title: "We read the code", desc: "AST scan finds every PII flow with file and line citations." },
  { n: "3", title: "Ship the artifacts", desc: "Policy, consent banner, deletion routes, score, audit PDF." },
];

const DELIVERABLES = [
  { Icon: FileText, label: "PRIVACY.md", desc: "Policy with file:line citations" },
  { Icon: Code2, label: "consent.tsx", desc: "Working consent banner component" },
  { Icon: ShieldCheck, label: "deletion + export routes", desc: "DPDP data-rights endpoints" },
  { Icon: FileCheck2, label: "audit.pdf", desc: "Scored, downloadable report" },
];

function scoreTone(score: number) {
  return score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiErrorMsg, setApiErrorMsg] = useState("");
  const [corpusEmpty, setCorpusEmpty] = useState(false);
  const { state: apiState, startLoading, setOk, setError } = useApiState();

  useEffect(() => {
    startLoading();
    (async () => {
      try {
        const token = await getToken();
        const [data, corpus] = await Promise.allSettled([
          api.scan.list(token ?? "") as Promise<ScanRow[]>,
          api.corpus.status(),
        ]);
        if (data.status === "fulfilled") {
          setScans(data.value);
          setOk();
        } else {
          setApiErrorMsg(data.reason?.message ?? "Couldn't reach the scanner");
          setError();
        }
        if (corpus.status === "fulfilled" && !corpus.value.loaded) setCorpusEmpty(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  const completed = scans.filter((s) => s.status === "completed" || s.status === "completed_with_errors");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.compliance_score ?? 0), 0) / completed.length)
    : null;
  const lastScan = scans[0]?.started_at ? new Date(scans[0].started_at) : null;

  const hasScans = !loading && scans.length > 0;
  const firstRun = !loading && scans.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-bg-11 tracking-tight">Dashboard</h1>
          <p className="text-sm text-bg-7 mt-1">Your compliance posture, straight from the code.</p>
        </div>
        <Link href="/scans/new">
          <Button className="gap-1.5"><Plus size={15} />New scan</Button>
        </Link>
      </div>

      <ApiStateBanner
        state={apiState}
        errorMessage={apiErrorMsg || undefined}
        onRetry={() => window.location.reload()}
      />

      {corpusEmpty && (
        <div role="status" aria-live="polite" className="px-4 py-3 bg-warning/10 border border-warning/25 rounded-lg text-sm text-warning">
          Legal corpus not loaded. Policy generation will produce draft-only output until it is restored.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      )}

      {/* First run: a designed activation surface, not an empty card */}
      {firstRun && (
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
          {/* Left: get started */}
          <div className="animate-slide-up rounded-2xl border border-bg-4 bg-bg-1 p-7 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-mint-9/10 border border-mint-9/20 px-3 py-1 text-xs font-medium text-mint-9 mb-5">
              <ScanLine size={13} /> First scan
            </div>
            <h2 className="font-display text-xl font-bold text-bg-11 tracking-tight">Turn a repo into compliance artifacts</h2>
            <p className="text-sm text-bg-8 mt-2 leading-relaxed max-w-md">
              No questionnaires. ShipComply reads your source and writes the legal artifacts, in under five minutes.
            </p>

            <ol className="mt-6 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.n} className="flex gap-3.5 animate-slide-up" style={{ animationDelay: `${80 + i * 70}ms`, opacity: 0 }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-bg-3 border border-bg-5 text-mint-9 font-mono text-xs flex items-center justify-center tabular-nums">{s.n}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bg-11">{s.title}</p>
                    <p className="text-xs text-bg-7 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link href="/scans/new" className="shrink-0"><Button size="lg" className="gap-2 shadow-glow-sm whitespace-nowrap">Start a scan <ArrowRight size={15} /></Button></Link>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_REPOS.map((r) => (
                  <Link key={r.url} href={`/scans/new?repo=${encodeURIComponent(r.url)}`}>
                    <span className="inline-block text-xs px-2.5 py-1.5 rounded-full bg-bg-3 border border-bg-5 text-bg-9 hover:bg-bg-4 hover:text-bg-11 hover:border-bg-6 transition-colors font-mono">{r.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: what you'll get */}
          <div className="animate-slide-up rounded-2xl border border-bg-4 bg-bg-1 p-7 md:p-8" style={{ animationDelay: "60ms", opacity: 0 }}>
            <p className="text-[11px] uppercase tracking-wider text-bg-7 mb-5">What every scan produces</p>
            <ul className="space-y-3">
              {DELIVERABLES.map((d, i) => (
                <li key={d.label} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${120 + i * 70}ms`, opacity: 0 }}>
                  <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-bg-3 border border-bg-4 flex items-center justify-center">
                    <d.Icon size={16} className="text-mint-9" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bg-11 font-mono">{d.label}</p>
                    <p className="text-xs text-bg-7">{d.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 pt-5 border-t border-bg-4 text-xs text-bg-6 leading-relaxed">
              Every artifact is prefixed with an attorney-review disclaimer. Citations are validated against the DPDP knowledge graph.
            </p>
          </div>
        </div>
      )}

      {/* Has scans: posture strip + recent list */}
      {hasScans && (
        <>
          <div className="animate-fade-in flex flex-wrap items-stretch rounded-2xl border border-bg-4 bg-bg-1 divide-x divide-bg-4">
            <div className="px-6 py-5 flex-1 min-w-[33%]">
              <p className="text-[11px] uppercase tracking-wider text-bg-7">Scans</p>
              <p className="mt-1 text-2xl font-semibold text-bg-11 tabular-nums font-mono">{scans.length}</p>
            </div>
            <div className="px-6 py-5 flex-1 min-w-[33%]">
              <p className="text-[11px] uppercase tracking-wider text-bg-7">Avg score</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums font-mono ${avgScore !== null ? scoreTone(avgScore) : "text-bg-6"}`}>
                {avgScore !== null ? avgScore : "-"}<span className="text-bg-6 text-sm">{avgScore !== null ? "/100" : ""}</span>
              </p>
            </div>
            <div className="px-6 py-5 flex-1 min-w-[33%]">
              <p className="text-[11px] uppercase tracking-wider text-bg-7">Last scan</p>
              <p className="mt-1 text-2xl font-semibold text-bg-10 tabular-nums font-mono">
                {lastScan ? lastScan.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-"}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-bg-9">Recent scans</h2>
              <Link href="/scans" className="text-xs text-bg-7 hover:text-mint-9 transition-colors">View all →</Link>
            </div>
            <div className="rounded-2xl border border-bg-4 bg-bg-1 divide-y divide-bg-4 overflow-hidden">
              {scans.slice(0, 8).map((s, i) => (
                <Link
                  key={s.scan_id}
                  href={`/scans/${s.scan_id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-bg-2 transition-colors group animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bg-11 truncate group-hover:text-mint-9 transition-colors" title={s.repo_url}>
                      {s.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                    </p>
                    <p className="text-xs text-bg-7 mt-0.5 font-mono">
                      {s.jurisdiction} · {s.started_at ? new Date(s.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {s.compliance_score !== null && (
                      <span className="hidden sm:flex items-center gap-2">
                        <span className="h-1.5 w-16 rounded-full bg-bg-3 overflow-hidden">
                          <span className={`block h-full rounded-full ${s.compliance_score >= 80 ? "bg-success" : s.compliance_score >= 50 ? "bg-warning" : "bg-danger"}`} style={{ width: `${s.compliance_score}%` }} />
                        </span>
                        <span className={`text-sm font-semibold tabular-nums font-mono w-7 text-right ${scoreTone(s.compliance_score)}`}>{s.compliance_score}</span>
                      </span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
