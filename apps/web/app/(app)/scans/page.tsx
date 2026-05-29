"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { AlertCircle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  { label: "vercel/next.js",    url: "https://github.com/vercel/next.js" },
  { label: "supabase/supabase", url: "https://github.com/supabase/supabase" },
  { label: "calcom/cal.com",    url: "https://github.com/calcom/cal.com" },
];

export default function ScansPage() {
  const { getToken } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await api.scan.list(token ?? "") as ScanRow[];
        setScans(data);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : "Could not reach the API");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bg-11 tracking-tight">Scans</h1>
          <p className="text-sm text-bg-7 mt-1">History of all compliance scans.</p>
        </div>
        <Link href="/scans/new"><Button>New scan</Button></Link>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-danger/10 border border-danger/25 rounded-lg text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">API unreachable</span>
            <span className="text-danger/80 ml-1">({apiError}). The scanner may still be waking up.</span>
          </div>
        </div>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>All scans</CardTitle>
          <CardDescription>Full history of your compliance scans</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-3 flex items-center justify-center">
                <ScanLine size={20} className="text-bg-7" />
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
            <>
              <div className="flex items-center justify-between px-1 py-2 text-xs font-medium text-bg-6 uppercase tracking-wider border-b border-bg-4 mb-1">
                <span>Repository</span>
                <div className="flex items-center gap-6">
                  <span>Score</span>
                  <span>Status</span>
                  <span>Started</span>
                </div>
              </div>
              <div className="divide-y divide-bg-4">
                {scans.map((s) => (
                  <Link
                    key={s.scan_id}
                    href={`/scans/${s.scan_id}`}
                    className="flex items-center justify-between py-3 px-1 hover:bg-bg-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bg-11 truncate">
                        {s.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                      </p>
                      <p className="text-xs text-bg-7 mt-0.5">{s.jurisdiction}</p>
                    </div>
                    <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                      <span className="text-sm tabular-nums text-bg-9 w-16 text-right">
                        {s.compliance_score !== null ? `${s.compliance_score}/100` : "-"}
                      </span>
                      <StatusBadge status={s.status} />
                      <span className="text-xs text-bg-7 w-24 text-right">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
