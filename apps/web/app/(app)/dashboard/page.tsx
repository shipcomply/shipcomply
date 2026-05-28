"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const totalFiles = scans.reduce((sum, s) => sum + (s.files_scanned ?? 0), 0);
  const isFirstTime = !loading && scans.length === 0 && apiState !== "error";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Dashboard</h1>
          <p className="text-bg-8 text-sm mt-0.5">Overview of your compliance scans</p>
        </div>
        <Link href="/scans/new">
          <Button>New scan</Button>
        </Link>
      </div>

      <ApiStateBanner
        state={apiState}
        errorMessage={apiErrorMsg || undefined}
        onRetry={() => window.location.reload()}
      />

      {corpusEmpty && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/25 rounded-lg text-sm text-warning"
        >
          <span>Legal corpus not loaded — policy generation will produce draft-only output. Contact support if this persists.</span>
        </div>
      )}

      {isFirstTime && (
        <div className="flex items-center gap-4 px-5 py-4 bg-mint-9/10 border border-mint-9/25 rounded-xl">
          <Rocket size={20} className="text-mint-9 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-bg-11">Try scanning a public repo to see ShipComply in action</p>
            <p className="text-xs text-bg-8 mt-0.5">Detects PII flows, generates a privacy policy with file:line citations, and scores your compliance.</p>
          </div>
          <Link href="/scans/new">
            <Button size="sm">Start a scan →</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          [
            { label: "Total scans",   value: String(scans.length),                   sub: "all time" },
            { label: "Avg score",     value: avgScore !== null ? `${avgScore}` : "—", sub: "compliance" },
            { label: "Files scanned", value: String(totalFiles),                      sub: "across all scans" },
          ].map((s) => (
            <Card key={s.label} variant="bordered">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-bg-11 tabular-nums mb-1">{s.value}</div>
                <div className="text-sm font-medium text-bg-9">{s.label}</div>
                <div className="text-xs text-bg-7 mt-0.5">{s.sub}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
          <CardDescription>Your latest compliance scans</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-3 flex items-center justify-center">
                <Rocket size={20} className="text-bg-7" />
              </div>
              <div>
                <p className="text-bg-9 text-sm font-medium">No scans yet</p>
                <p className="text-bg-7 text-xs mt-1">Scan any public repo to generate your first compliance report.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_REPOS.map((r) => (
                  <Link key={r.url} href={`/scans/new?repo=${encodeURIComponent(r.url)}`}>
                    <Button variant="secondary" size="sm">{r.label}</Button>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-bg-4">
              {scans.map((s) => (
                <Link
                  key={s.scan_id}
                  href={`/scans/${s.scan_id}`}
                  className="flex items-center justify-between py-3 px-1 hover:bg-bg-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium text-bg-11 truncate"
                      title={s.repo_url}
                    >
                      {s.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                    </p>
                    <p className="text-xs text-bg-7 mt-0.5">
                      {s.jurisdiction} · {s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {s.compliance_score !== null && (
                      <span className="text-sm tabular-nums font-medium text-bg-9">{s.compliance_score}/100</span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
