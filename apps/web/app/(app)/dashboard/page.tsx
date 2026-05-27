"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface ScanRow {
  scan_id: string;
  status: string;
  repo_url: string;
  jurisdiction: string;
  compliance_score: number | null;
  files_scanned: number | null;
  started_at: string | null;
  completed_at: string | null;
}

function scoreVariant(score: number | null): "success" | "warning" | "danger" | "default" {
  if (score === null) return "default";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await api.scan.list(token ?? "") as ScanRow[];
        setScans(data);
      } catch {
        // API unreachable on first load — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const total = scans.length;
  const completed = scans.filter((s) => s.status === "completed" || s.status === "completed_with_errors");
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, s) => sum + (s.compliance_score ?? 0), 0) / completed.length
        )
      : null;
  const totalElements = scans.reduce((sum, s) => sum + (s.files_scanned ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Dashboard</h1>
          <p className="text-bg-8 text-sm mt-0.5">Overview of your compliance scans</p>
        </div>
        <Link href="/scans/new">
          <Button>New scan</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total scans", value: loading ? "…" : String(total), sub: "all time" },
          { label: "Avg score", value: loading ? "…" : avgScore !== null ? String(avgScore) : "—", sub: "compliance" },
          { label: "Files scanned", value: loading ? "…" : String(totalElements), sub: "across all scans" },
        ].map((s) => (
          <Card key={s.label} variant="bordered">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-bg-11 mb-1">{s.value}</div>
              <div className="text-sm font-medium text-bg-9">{s.label}</div>
              <div className="text-xs text-bg-7 mt-0.5">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
          <CardDescription>Your latest compliance scans</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <div className="text-5xl opacity-20 animate-pulse">◎</div>
              <p className="text-bg-7 text-sm">Loading scans…</p>
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="text-5xl opacity-20">◎</div>
              <p className="text-bg-8 text-sm max-w-xs">
                No scans yet. Connect a GitHub repository and run your first compliance scan.
              </p>
              <div className="flex gap-3">
                <Link href="/repos">
                  <Button variant="secondary" size="sm">Connect a repo</Button>
                </Link>
                <Link href="/scans/new">
                  <Button size="sm">Scan a URL</Button>
                </Link>
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
                    <p className="text-sm font-medium text-bg-11 truncate">
                      {s.repo_url.replace(/^https?:\/\/(github\.com\/)?/, "")}
                    </p>
                    <p className="text-xs text-bg-7 mt-0.5">
                      {s.jurisdiction} · {s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {s.compliance_score !== null && (
                      <Badge variant={scoreVariant(s.compliance_score)}>
                        {s.compliance_score}/100
                      </Badge>
                    )}
                    <Badge variant={s.status === "completed" ? "success" : s.status === "failed" ? "danger" : "default"}>
                      {s.status}
                    </Badge>
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
