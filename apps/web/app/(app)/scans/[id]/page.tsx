"use client";
import { use, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, API_BASE, getAuthHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SeverityPill } from "@/components/ui/severity-pill";
import { Download, AlertTriangle } from "lucide-react";

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
  audit_markdown?: string;
  corpus_available?: boolean;
}

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
        <div className="text-2xl font-bold tabular-nums text-bg-11">{display}</div>
        <div className="text-xs text-bg-7">/ 100</div>
      </div>
    </div>
  );
}

function downloadBlob(content: string, filename: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getToken } = useAuth();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [scanStatus, setScanStatus] = useState("loading");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleDownload(type: "policy" | "audit") {
    if (downloading) return;
    setDownloading(type);
    try {
      const token = await getToken();
      if (type === "policy") {
        const data = await api.scan.policy(id, token ?? "") as { markdown?: string; sections?: { body: string }[] };
        const md = data.markdown ?? data.sections?.map((s) => s.body).join("\n\n") ?? "";
        downloadBlob(md, `policy-${id.slice(0, 8)}.md`);
        toast.success("Policy downloaded");
      } else {
        const data = await api.scan.audit(id, token ?? "") as { audit_markdown?: string };
        const md = data.audit_markdown ?? JSON.stringify(data, null, 2);
        downloadBlob(md, `audit-${id.slice(0, 8)}.md`);
        toast.success("Audit report downloaded");
      }
    } catch {
      toast.error("Download failed — please try again");
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchAudit(token: string) {
      const raw = await api.scan.audit(id, token);
      if (cancelled) return;
      const a = raw as AuditData;
      setAudit({ ...a, findings: a.findings ?? [] });
    }

    async function startSSE() {
      const token = await getToken();
      if (cancelled) return;

      try {
        const res = await fetch(`${API_BASE}/api/v1/scans/${id}/stream`, {
          headers: getAuthHeaders(token ?? ""),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const pump = async () => {
            while (!cancelled) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                try {
                  const payload = JSON.parse(line.slice(5).trim());
                  const s: string = payload.status ?? payload.step ?? "";
                  if (s) setScanStatus(s);
                  if (s === "completed" || s === "completed_with_errors") {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    await fetchAudit(token ?? "");
                    return;
                  }
                  if (s === "failed") {
                    setError(payload.error ?? "Scan failed. Please try again.");
                    return;
                  }
                } catch { /* non-JSON SSE line */ }
              }
            }
          };
          pump().catch(() => { if (!cancelled) fallbackPoll(token ?? ""); });
          return;
        }
      } catch { /* SSE unavailable — fall through */ }

      fallbackPoll(token ?? "");
    }

    function fallbackPoll(token: string) {
      async function poll() {
        try {
          const scan = await api.scan.get(id, token) as { status: string; error_message?: string };
          if (cancelled) return;
          setScanStatus(scan.status);
          if (scan.status === "completed" || scan.status === "completed_with_errors") {
            if (intervalRef.current) clearInterval(intervalRef.current);
            await fetchAudit(token);
          } else if (scan.status === "failed") {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setError(scan.error_message ?? "Scan failed. Please try again.");
          }
        } catch (e: unknown) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
        }
      }
      poll();
      intervalRef.current = setInterval(poll, 3000);
    }

    startSSE();
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, getToken]);

  const score = Number.isFinite(audit?.score) ? audit!.score : 0;
  const findings = audit?.findings ?? [];
  const isRunning = !audit && !error;

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-bg-0/90 backdrop-blur-sm border-b border-bg-4 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-bg-11">Compliance audit</h1>
          <p className="text-xs text-bg-7 font-mono truncate">{id}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={error ? "failed" : scanStatus} />
          {audit && (
            <span className={cn(
              "text-sm tabular-nums font-semibold",
              score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-danger"
            )}>{score}/100</span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-danger/15 flex items-center justify-center">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-bg-9 font-medium">{error}</p>
            <p className="text-bg-7 text-sm mt-1">Check your API connection or try again.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
            <a href="/scans/new"><Button>New scan</Button></a>
          </div>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {isRunning && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <p className="text-center text-sm text-bg-7 animate-pulse">
            {scanStatus === "loading" ? "Connecting…" : `${scanStatus.replace(/_/g, " ")}…`}
          </p>
        </div>
      )}

      {/* Results */}
      {audit && (
        <AnimatePresence>
          {/* Corpus warning */}
          {audit.corpus_available === false && (
            <motion.div key="corpus-warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/25 rounded-lg text-sm text-warning">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span>Legal corpus not loaded — policy may be generic. Findings and score are unaffected.</span>
            </motion.div>
          )}

          {/* Score + stat cards */}
          <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="flex flex-col items-center justify-center py-6">
              <ScoreRing score={score} />
              <p className="text-xs text-bg-7 mt-2">Compliance score</p>
            </Card>
            {[
              { label: "Data elements", value: audit.total_elements ?? 0, color: "" },
              { label: "Critical issues", value: audit.critical_count ?? 0, color: "text-danger" },
              { label: "High severity",  value: audit.high_count ?? 0,     color: "text-warning" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.3 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className={cn("text-3xl font-bold tabular-nums mb-1", s.color || "text-bg-11")}>{s.value}</div>
                    <div className="text-sm text-bg-8">{s.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Audit markdown fallback */}
          {audit.audit_markdown && (
            <motion.div key="md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
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

          {/* Findings */}
          {findings.length > 0 && (
            <motion.div key="findings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader><CardTitle>Findings ({findings.length})</CardTitle></CardHeader>
                <CardContent className="divide-y divide-bg-4">
                  {findings.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      className="py-4 flex gap-4">
                      <div className={cn(
                        "w-1 rounded-full flex-shrink-0 self-stretch",
                        f.severity === "HIGH" || f.severity === "CRITICAL" ? "bg-danger"
                          : f.severity === "MEDIUM" ? "bg-warning" : "bg-info"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <SeverityPill severity={f.severity} />
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Downloads */}
          <motion.div key="downloads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader><CardTitle>Download artifacts</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="secondary" size="sm" disabled={downloading === "policy"}
                  onClick={() => handleDownload("policy")}>
                  <Download size={14} className="mr-2 opacity-70" />
                  {downloading === "policy" ? "Downloading…" : "Privacy policy (.md)"}
                </Button>
                <Button variant="secondary" size="sm" disabled={downloading === "audit"}
                  onClick={() => handleDownload("audit")}>
                  <Download size={14} className="mr-2 opacity-70" />
                  {downloading === "audit" ? "Downloading…" : "Audit report (.md)"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Legal disclaimer */}
          <motion.p key="disclaimer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="text-xs text-bg-6 text-center px-4 py-3 border border-bg-4 rounded-lg bg-bg-2">
            AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}
