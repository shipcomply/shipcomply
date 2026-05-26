"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Finding {
  severity: string;
  title: string;
  detail: string;
  file_path?: string;
  line_number?: number;
}

interface AuditData {
  score: number;
  total_elements?: number;
  critical_count?: number;
  high_count?: number;
  findings: Finding[];
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#63ffb5" : score >= 50 ? "#f59e0b" : "#ef4444";
  const dash = 251.2;
  const filled = (score / 100) * dash;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="40" fill="none" stroke="#2c2c3a" strokeWidth="8" />
        <circle cx="60" cy="60" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={filled + " " + dash} className="transition-all duration-slow" />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-bg-11">{score}</div>
        <div className="text-xs text-bg-7">/ 100</div>
      </div>
    </div>
  );
}

export default function ScanPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function poll() {
      try {
        const token = await getToken();
        const scan = await api.scan.get(params.id, token ?? "") as { status: string };
        setStatus(scan.status);
        if (scan.status === "completed") {
          const data = await api.scan.audit(params.id, token ?? "") as AuditData;
          setAudit(data);
          clearInterval(interval);
        } else if (scan.status === "failed") {
          setError("Scan failed. Please try again.");
          clearInterval(interval);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
        clearInterval(interval);
      }
    }
    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [params.id, getToken]);

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-danger text-lg font-medium">{error}</div>
    </div>
  );

  if (!audit) return (
    <div className="space-y-6">
      <Skeleton className="w-48 h-8 rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="text-center text-sm text-bg-7 animate-pulse">
        {status === "loading" ? "Loading..." : "Scanning... (" + status + ")"}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Compliance audit</h1>
          <p className="text-bg-8 text-sm mt-0.5">Scan ID: <span className="font-mono text-xs">{params.id}</span></p>
        </div>
        <Badge variant={audit.score >= 80 ? "success" : audit.score >= 50 ? "warning" : "danger"}>
          Score: {audit.score}/100
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card variant="bordered" className="flex flex-col items-center justify-center py-6">
          <ScoreRing score={audit.score} />
          <p className="text-xs text-bg-7 mt-2">Compliance score</p>
        </Card>
        {[
          { label: "Data elements", value: audit.total_elements ?? 0 },
          { label: "Critical issues", value: audit.critical_count ?? 0, color: "text-danger" },
          { label: "High severity", value: audit.high_count ?? 0, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label} variant="bordered">
            <CardContent className="pt-6">
              <div className={"text-3xl font-bold mb-1 " + (s.color ?? "text-bg-11")}>{s.value}</div>
              <div className="text-sm text-bg-8">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {audit.findings && audit.findings.length > 0 && (
        <Card variant="bordered">
          <CardHeader><CardTitle>Findings</CardTitle></CardHeader>
          <CardContent className="divide-y divide-bg-4">
            {audit.findings.map((f, i) => (
              <div key={i} className="py-4 flex gap-4">
                <div className={"w-1.5 rounded-full flex-shrink-0 self-stretch " + (f.severity === "HIGH" ? "bg-danger" : f.severity === "MEDIUM" ? "bg-warning" : "bg-info")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={f.severity === "HIGH" ? "danger" : f.severity === "MEDIUM" ? "warning" : "info"}>{f.severity}</Badge>
                    <span className="text-sm font-medium text-bg-11 truncate">{f.title}</span>
                  </div>
                  <p className="text-sm text-bg-8 leading-relaxed">{f.detail}</p>
                  {f.file_path && <p className="text-xs font-mono text-bg-7 mt-1">{f.file_path}{f.line_number ? ":" + f.line_number : ""}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-bg-7 text-center">AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING</p>
    </div>
  );
}
