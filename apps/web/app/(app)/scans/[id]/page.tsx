import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Finding {
  element_type: string;
  severity: string;
  regulation_refs: string[];
  description: string;
  remediation: string;
  affected_files: string[];
}

interface AuditData {
  scan_id: string;
  score: number | null;
  score_label: string;
  files_scanned: number;
  elements_found: number;
  findings: Finding[];
}

async function fetchAudit(scanId: string): Promise<AuditData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/scans/${scanId}/audit`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function ScoreRing({ score }: { score: number | null }) {
  const display = score ?? "N/A";
  const pct = score ?? 0;
  // CSS conic-gradient ring — no D3 dep
  const color =
    pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : pct >= 25 ? "#f97316" : "#ef4444";
  const gradient = score !== null
    ? `conic-gradient(${color} ${pct}%, #1f2937 ${pct}%)`
    : "conic-gradient(#374151 100%)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            background: "#15151c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "1.5rem", fontWeight: 700, color: score !== null ? color : "#6b7280" }}>
            {display}
          </span>
        </div>
      </div>
      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>out of 100</span>
    </div>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

interface ScanPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { id } = await params;
  const audit = await fetchAudit(id);

  return (
    <div className="min-h-screen p-8" style={{ background: "#0a0a0f" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <a href="/dashboard" style={{ color: "#9ca3af", fontSize: "0.875rem", textDecoration: "none" }}>
            &larr; Back to dashboard
          </a>
        </div>

        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>
            Compliance Scan
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>ID: {id}</p>
        </div>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
          {/* Score ring */}
          <div
            style={{
              background: "#15151c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ScoreRing score={audit?.score ?? null} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontWeight: 600 }}>
                {audit?.score_label ?? (audit ? "N/A" : "Loading...")}
              </div>
              {audit && (
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  {audit.files_scanned} files · {audit.elements_found} PII elements
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              background: "#15151c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ color: "#fff", fontWeight: 600, marginBottom: "1rem" }}>Scan Summary</h2>
            {audit ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { label: "Compliance Score", value: audit.score !== null ? `${audit.score}/100` : "N/A" },
                  { label: "Score Label", value: audit.score_label },
                  { label: "Files Scanned", value: String(audit.files_scanned) },
                  { label: "PII Elements", value: String(audit.elements_found) },
                  { label: "Total Findings", value: String(audit.findings.length) },
                  { label: "High Severity", value: String(audit.findings.filter((f) => f.severity === "HIGH").length) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
                    <div style={{ color: "#e5e7eb", fontWeight: 500, marginTop: "0.125rem" }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#6b7280" }}>Loading scan data...</p>
            )}
          </div>
        </div>

        {/* Findings */}
        <div
          style={{
            background: "#15151c",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ color: "#fff", fontWeight: 600, marginBottom: "1rem" }}>
            Compliance Findings {audit && `(${audit.findings.length})`}
          </h2>
          {audit?.findings.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {audit.findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `3px solid ${SEVERITY_COLOR[f.severity] ?? "#6b7280"}`,
                    paddingLeft: "1rem",
                    paddingTop: "0.5rem",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.4rem",
                        borderRadius: "3px",
                        background: SEVERITY_COLOR[f.severity] + "33",
                        color: SEVERITY_COLOR[f.severity],
                        letterSpacing: "0.05em",
                      }}
                    >
                      {f.severity}
                    </span>
                    <span style={{ color: "#e5e7eb", fontWeight: 500, fontSize: "0.9rem" }}>
                      {f.element_type}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                      {f.regulation_refs.slice(0, 2).join(" · ")}
                    </span>
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: "0.8rem", margin: "0.25rem 0" }}>{f.description}</p>
                  {f.affected_files[0] && (
                    <code style={{ fontSize: "0.7rem", color: "#63ffb5", background: "rgba(99,255,181,0.08)", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>
                      {f.affected_files[0]}
                    </code>
                  )}
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                    <strong style={{ color: "#9ca3af" }}>Fix: </strong>{f.remediation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>{audit ? "No findings." : "Loading..."}</p>
          )}
        </div>

        {/* Download links */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { label: "Privacy Policy", href: `/api/scans/${id}/policy.md` },
            { label: "Audit Report", href: `/api/scans/${id}/audit.md` },
            { label: "Knowledge Graph", href: `/api/v1/scans/${id}/graph` },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                textDecoration: "none",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Download {label}
            </a>
          ))}
        </div>

        <p style={{ fontSize: "0.7rem", color: "#374151" }}>
          AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
        </p>
      </div>
    </div>
  );
}
