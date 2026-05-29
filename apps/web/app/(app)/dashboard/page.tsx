"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Rocket, ScanLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { label: "vercel/next.js",    url: "https://github.com/vercel/next.js" },
  { label: "supabase/supabase", url: "https://github.com/supabase/supabase" },
  { label: "calcom/cal.com",    url: "https://github.com/calcom/cal.com" },
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{score}</span>;
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
  const isFirstTime = !loading && scans.length === 0 && apiState !== "error";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-bg-11">Dashboard</h1>
        <Link href="/scans/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={14} />
            New scan
          </Button>
        </Link>
      </div>

      {/* API state banner */}
      <ApiStateBanner
        state={apiState}
        errorMessage={apiErrorMsg || undefined}
        onRetry={() => window.location.reload()}
      />

      {/* Corpus warning */}
      {corpusEmpty && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/25 rounded-lg text-sm text-warning"
        >
          Legal corpus not loaded. Policy generation will produce draft-only output. Contact support if this persists.
        </div>
      )}

      {/* First-time empty state */}
      {isFirstTime ? (
        <div className="py-16 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-mint-9/10 border border-mint-9/20 flex items-center justify-center">
            <ScanLine size={28} className="text-mint-9" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-bg-11 mb-2">Run your first compliance scan</h2>
            <p className="text-bg-8 text-sm max-w-sm mx-auto leading-relaxed">
              Paste any public GitHub URL. We detect PII flows, generate a privacy policy with file:line citations, and score your compliance.
            </p>
          </div>
          <Link href="/scans/new">
            <Button size="lg" className="shadow-glow-sm">Start a scan</Button>
          </Link>
          <div>
            <p className="text-xs text-bg-7 mb-3">Or try a demo repo</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_REPOS.map((r) => (
                <Link key={r.url} href={`/scans/new?repo=${encodeURIComponent(r.url)}`}>
                  <button className="text-xs px-3 py-1.5 rounded-full bg-bg-3 border border-bg-5 text-bg-9 hover:bg-bg-4 hover:text-bg-11 transition-colors font-mono">
                    {r.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card variant="bordered">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Recent scans</CardTitle>
              {/* Compact inline stats - no hero-metric card grid */}
              {!loading && scans.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-bg-7">
                  <span><span className="font-semibold text-bg-9 tabular-nums">{scans.length}</span> total</span>
                  {avgScore !== null && (
                    <span>avg score <span className="font-semibold text-bg-9 tabular-nums">{avgScore}/100</span></span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : scans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Rocket size={20} className="text-bg-6" />
                <p className="text-bg-8 text-sm">No scans yet</p>
                <Link href="/scans/new">
                  <Button variant="secondary" size="sm">Start a scan</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-bg-4">
                {scans.map((s) => (
                  <Link
                    key={s.scan_id}
                    href={`/scans/${s.scan_id}`}
                    className="flex items-center justify-between py-3 px-1 hover:bg-bg-2 rounded-lg transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium text-bg-11 truncate group-hover:text-mint-9 transition-colors"
                        title={s.repo_url}
                      >
                        {s.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                      </p>
                      <p className="text-xs text-bg-7 mt-0.5 font-mono">
                        {s.jurisdiction} · {s.started_at ? new Date(s.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {s.compliance_score !== null && <ScoreRing score={s.compliance_score} />}
                      <StatusBadge status={s.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
