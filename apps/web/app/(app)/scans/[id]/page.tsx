"use client";
import { use, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
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

interface AuditStructured {
  score: number;
  total_elements?: number;
  critical_count?: number;
  high_count?: number;
  findings: Finding[];
  audit_markdown?: never;
}

interface AuditMarkdown {
  audit_markdown: string;
  score: number;
  findings: Finding[];
  audit_structured?: never;
}

type AuditData = AuditStructured | AuditMarkdown;

function ScoreRing({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);
  const safeScore = Number.isFinite(score) ? score : 0;
  const color = safeScore >= 80 ? "#63ffb5" : safeScore >= 50 ? "#f59e0b" : "#ef4444";
  const dash = 251.2;
  const filled = (display / 100) * dash;

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * safeScore));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeScore]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="40" fill="none" stroke="#2c2c3a" strokeWidth="8" />
        <circle cx="60" cy="60" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${filled} ${dash}`} style={{ transition: "stroke-dasharray 16ms linear" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-bg-11">{display}</div>
        <div className="text-xs text-bg-7">/ 100</div>
      </div>
    </div>
  );
}

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getToken } = useAuth();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [scanStatus, setScanStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const token = await getToken();
        const scan = await api.scan.get(id, token ?? "") as { status: string };
        if (cancelled) return;
        setScanStatus(scan.status);

        if (scan.status === "completed" || scan.status === "completed_with_errors") {
          clearInterval(interval);
          const raw = await api.scan.audit(id, token ?? "");
          if (cancelled) return;
          const normalised: AuditData = "audit_markdown" in (raw as object)
            ? { ...(raw as AuditMarkdown), findings: (raw as AuditMarkdown).findings ?? [] }
            : { ...(raw as AuditStructured), findings: (raw as AuditStructured).findings ?? [] };
          setAudit(normalised);
        } else if (scan.status === "failed") {
          setError("Scan failed. Please try again.");
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id, getToken]);

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-danger text-lg font-medium mb-2">{error}</div>
      <a href="/scans/new" className="text-sm text-mint-9 underline underline-offset-2">Start a new scan</a>
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
        {scanStatus === "loading" ? "Loading..." : `Scanning… (${scanStatus})`}
      </div>
    </div>
  );

  const score = Number.isFinite(audit.score) ? audit.score : 0;
  const findings = audit.findings ?? [];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Compliance audit</h1>
          <p className="text-bg-8 text-sm mt-0.5">
            Scan ID: <span className="font-mono text-xs">{id}</span>
          </p>
        </div>
        <Badge variant={score >= 80 ? "success" : score >= 50 ? "warning" : "danger"}>
          Score: {score}/100
        </Badge>
      </motion.div>

      {"audit_markdown" in audit && audit.audit_markdown && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Card>
            <CardHeader><CardTitle>Audit report</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs text-bg-8 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                {audit.audit_markdown}
              </pre>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!("audit_markdown" in audit) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="grid grid-cols-4 gap-4">
          <Card className="flex flex-col items-center justify-center py-6">
            <ScoreRing score={score} />
            <p className="text-xs text-bg-7 mt-2">Compliance score</p>
          </Card>
          {[
            { label: "Data elements", value: (audit as AuditStructured).total_elements ?? 0 },
            { label: "Critical issues", value: (audit as AuditStructured).critical_count ?? 0, color: "text-danger" },
            { label: "High severity", value: (audit as AuditStructured).high_count ?? 0, color: "text-warning" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.3 }}>
              <Card>
                <CardContent className="pt-6">
                  <div className={cn("text-3xl font-bold mb-1", s.color ?? "text-bg-11")}>{s.value}</div>
                  <div className="text-sm text-bg-8">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {findings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Findings ({findings.length})</CardTitle></CardHeader>
          <CardContent className="divide-y divide-bg-4">
            <AnimatePresence>
              {findings.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="py-4 flex gap-4">
                  <div className={cn(
                    "w-1.5 rounded-full flex-shrink-0 self-stretch",
                    f.severity === "HIGH" || f.severity === "CRITICAL" ? "bg-danger"
                      : f.severity === "MEDIUM" ? "bg-warning" : "bg-info"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={
                        f.severity === "HIGH" || f.severity === "CRITICAL" ? "danger"
                          : f.severity === "MEDIUM" ? "warning" : "info"
                      }>{f.severity}</Badge>
                      <span className="text-sm font-medium text-bg-11 truncate">{f.title}</span>
                    </div>
                    <p className="text-sm text-bg-8 leading-relaxed">{f.detail}</p>
                    {f.file_path && (
                      <p className="text-xs font-mono text-bg-7 mt-1">
                        {f.file_path}{f.line_number ? `:${f.line_number}` : ""}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-bg-7 text-center">
        AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
      </p>
    </div>
  );
}
