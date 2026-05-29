"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { AlertCircle, ScanLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
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

function scoreTone(score: number) {
  return score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
}
function barTone(score: number) {
  return score >= 80 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger";
}

// Free-tier API cold-starts (~50s) can reject the first request; retry before erroring.
async function listScansWithRetry(token: string, tries = 4, gapMs = 8000): Promise<ScanRow[]> {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return (await api.scan.list(token)) as ScanRow[];
    } catch (err) {
      if (err instanceof TypeError && attempt < tries - 1) {
        await new Promise((r) => setTimeout(r, gapMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

export default function ScansPage() {
  const { getToken } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await listScansWithRetry(token ?? "");
        if (!cancelled) setScans(data);
      } catch (err: unknown) {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Could not reach the API");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const completed = scans.filter((s) => s.status === "completed" || s.status === "completed_with_errors");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.compliance_score ?? 0), 0) / completed.length)
    : null;
  const lastScan = scans[0]?.started_at ? new Date(scans[0].started_at) : null;
  const hasScans = !loading && scans.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-bg-11 tracking-tight">Scans</h1>
          <p className="text-sm text-bg-7 mt-1">Every compliance scan you have run.</p>
        </div>
        <Link href="/scans/new"><Button className="gap-1.5"><Plus size={15} />New scan</Button></Link>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/25 rounded-lg text-sm text-warning">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-bg-10">Scanner is waking up</span>
            <span className="text-bg-8 ml-1">Free-tier cold start takes ~50s. <button onClick={() => window.location.reload()} className="text-mint-9 hover:text-mint-11 underline-offset-2 hover:underline">Retry</button></span>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      )}

      {hasScans && (
        <>
          <div className="flex flex-wrap items-stretch rounded-2xl border border-bg-4 bg-bg-1 divide-x divide-bg-4">
            <div className="px-6 py-5 flex-1 min-w-[33%]">
              <p className="text-[11px] uppercase tracking-wider text-bg-7">Total scans</p>
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

          <div className="rounded-2xl border border-bg-4 bg-bg-1 divide-y divide-bg-4 overflow-hidden">
            {scans.map((s, i) => (
              <Link
                key={s.scan_id}
                href={`/scans/${s.scan_id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-bg-2 transition-colors group animate-slide-up"
                style={{ animationDelay: `${i * 35}ms`, opacity: 0 }}
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
                        <span className={`block h-full rounded-full ${barTone(s.compliance_score)}`} style={{ width: `${s.compliance_score}%` }} />
                      </span>
                      <span className={`text-sm font-semibold tabular-nums font-mono w-7 text-right ${scoreTone(s.compliance_score)}`}>{s.compliance_score}</span>
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!loading && scans.length === 0 && (
        <div className="rounded-2xl border border-bg-4 bg-bg-1 py-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-mint-9/10 border border-mint-9/20 flex items-center justify-center">
            <ScanLine size={22} className="text-mint-9" />
          </div>
          <div>
            <p className="text-bg-10 text-sm font-medium">No scans yet</p>
            <p className="text-bg-7 text-xs mt-1">Scan any public repo to generate your first compliance report.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLE_REPOS.map((r) => (
              <Link key={r.url} href={`/scans/new?repo=${encodeURIComponent(r.url)}`}>
                <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-bg-3 border border-bg-5 text-bg-9 hover:bg-bg-4 hover:text-bg-11 hover:border-bg-6 transition-colors font-mono">{r.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
