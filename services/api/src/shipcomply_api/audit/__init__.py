"""
Audit Agent — scores compliance and generates a Markdown + PDF audit report.

Scoring model:
  - Base score starts at 100
  - Each unmitigated finding deducts points by severity
  - Score is ONLY meaningful when files_scanned > 0 (scope denominator)
  - If files_scanned == 0 or no data_elements: score = None ("N/A")

Finding severities:
  HIGH   (-20): Sensitive PII (aadhaar, pan, ssn, payment) with no consent check
  MEDIUM (-10): Standard PII (email, phone, name) collected without clear notice
  LOW    (-5):  Analytics SDKs detected without explicit opt-in evidence
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

log = logging.getLogger(__name__)

DISCLAIMER = "AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING"

SEVERITY_DEDUCTIONS = {"HIGH": 20, "MEDIUM": 10, "LOW": 5}

HIGH_SENSITIVITY_TYPES = {"aadhaar", "pan", "ssn", "payment"}
MEDIUM_SENSITIVITY_TYPES = {"email", "phone", "name", "address", "dob"}
LOW_SENSITIVITY_TYPES = {"analytics"}

# Maps compliance flag -> human-readable description
FLAG_DESCRIPTIONS: dict[str, str] = {
    "DPDP_S4":    "DPDP Act 2023 §4 — Grounds for processing personal data",
    "DPDP_S7":    "DPDP Act 2023 §7 — Legitimate uses without consent",
    "DPDP_S9":    "DPDP Act 2023 §9 — Children's data — verifiable parental consent required",
    "GDPR_A5_1_A": "GDPR Art 5(1)(a) — Lawfulness, fairness, transparency",
    "GDPR_A5_1_B": "GDPR Art 5(1)(b) — Purpose limitation",
    "GDPR_A9":    "GDPR Art 9 — Special category data — explicit consent required",
    "GDPR_A13":   "GDPR Art 13 — Information to data subject at time of collection",
    "CCPA_S1798_140": "CCPA §1798.140 — Definition of personal information",
    "PCI_DSS":    "PCI DSS — Payment card data must be encrypted; scope reduction recommended",
}

REMEDIATION_ADVICE: dict[str, str] = {
    "email":     "Add a clear notice explaining why you collect email addresses. Implement opt-in consent and provide an unsubscribe mechanism.",
    "phone":     "Display the purpose of phone number collection at the point of input. Allow users to opt out of non-essential communications.",
    "name":      "Explain why name data is required. Apply data minimisation — collect only first name if last name is not needed.",
    "address":   "Justify collection of address data. Limit to what is strictly necessary for service delivery.",
    "dob":       "Date of birth is sensitive. Verify consent is explicit and parental consent is obtained for users under 18.",
    "pan":       "PAN is a sensitive financial identifier. Encrypt at rest, restrict access, and implement explicit consent.",
    "aadhaar":   "Aadhaar is highly regulated under the Aadhaar Act 2016. Do not store; use authentication APIs only.",
    "ssn":       "SSN is highly sensitive. Store encrypted, limit access, and ensure CCPA/GDPR compliance.",
    "payment":   "Payment data is PCI DSS scope. Use a certified payment processor (Stripe, Razorpay) and never store raw card data.",
    "analytics": "Ensure analytics SDKs are loaded only after explicit user consent. Provide opt-out mechanism.",
}


@dataclass
class ComplianceFinding:
    element_type: str
    severity: str               # "HIGH" | "MEDIUM" | "LOW"
    regulation_refs: list[str]
    description: str
    remediation: str
    affected_files: list[str]   # file:line citations


@dataclass
class AuditReport:
    scan_id: str
    score: Optional[int]        # None = N/A (no PII detected or no files scanned)
    score_label: str            # "N/A" | "Critical" | "Poor" | "Fair" | "Good" | "Excellent"
    files_scanned: int
    elements_found: int
    findings: list[ComplianceFinding] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "scan_id": self.scan_id,
            "score": self.score,
            "score_label": self.score_label,
            "files_scanned": self.files_scanned,
            "elements_found": self.elements_found,
            "generated_at": self.generated_at,
            "findings": [
                {
                    "element_type": f.element_type,
                    "severity": f.severity,
                    "regulation_refs": f.regulation_refs,
                    "description": f.description,
                    "remediation": f.remediation,
                    "affected_files": f.affected_files,
                }
                for f in self.findings
            ],
        }

    def to_markdown(self) -> str:
        score_display = str(self.score) if self.score is not None else "N/A"
        lines = [
            f"<!-- {DISCLAIMER} -->",
            f"<!-- shipcomply-managed: {self.scan_id} -->",
            "",
            "# Compliance Audit Report",
            "",
            f"*Generated: {self.generated_at[:10]} · Scan ID: `{self.scan_id}`*",
            "",
            f"> **{DISCLAIMER}**",
            "",
            "## Summary",
            "",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| Compliance Score | **{score_display}/100** ({self.score_label}) |",
            f"| Files Scanned | {self.files_scanned} |",
            f"| PII Elements Found | {self.elements_found} |",
            f"| Findings | {len(self.findings)} ({self._count_by_severity('HIGH')} High · {self._count_by_severity('MEDIUM')} Medium · {self._count_by_severity('LOW')} Low) |",
            "",
        ]

        if self.score is None:
            lines += [
                "## Score: N/A",
                "",
                "No PII data elements were detected in the scanned scope. ",
                "Score is not applicable — a zero-PII repo does not automatically pass compliance.",
                "",
            ]

        if self.findings:
            lines += ["## Findings", ""]
            for i, f in enumerate(self.findings, 1):
                lines += [
                    f"### {i}. [{f.severity}] {f.element_type.upper()} data detected",
                    "",
                    f"**Regulations:** {', '.join(f.regulation_refs)}",
                    "",
                    f.description,
                    "",
                    f"**Remediation:** {f.remediation}",
                    "",
                    "**Detected in:**",
                ]
                for cite in f.affected_files[:5]:
                    lines.append(f"- `{cite}`")
                lines.append("")
        else:
            lines += ["## Findings", "", "No compliance findings. Verify scan coverage is complete.", ""]

        return "\n".join(lines)

    def _count_by_severity(self, severity: str) -> int:
        return sum(1 for f in self.findings if f.severity == severity)


def _score_label(score: Optional[int]) -> str:
    if score is None:
        return "N/A"
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 50:
        return "Fair"
    if score >= 25:
        return "Poor"
    return "Critical"


class AuditAgent:
    """Produces a compliance score and audit report from a ScanResult."""

    def audit(self, scan) -> AuditReport:
        if scan.files_scanned == 0 or not scan.data_elements:
            return AuditReport(
                scan_id=scan.scan_id,
                score=None,
                score_label="N/A",
                files_scanned=scan.files_scanned,
                elements_found=0,
            )

        findings = self._build_findings(scan)
        deductions = sum(SEVERITY_DEDUCTIONS.get(f.severity, 0) for f in findings)
        score = max(0, 100 - deductions)

        report = AuditReport(
            scan_id=scan.scan_id,
            score=score,
            score_label=_score_label(score),
            files_scanned=scan.files_scanned,
            elements_found=len(scan.data_elements),
            findings=findings,
        )
        log.info(
            "audit scan_id=%s score=%s findings=%d",
            scan.scan_id, score, len(findings),
        )
        return report

    def _build_findings(self, scan) -> list[ComplianceFinding]:
        findings = []
        for el in scan.data_elements:
            severity = self._severity(el.element_type)
            affected = [f"{s.file}:{s.line}" for s in el.sources[:5]]
            flag_descs = [
                FLAG_DESCRIPTIONS.get(f, f) for f in el.compliance_flags[:3]
            ]
            findings.append(
                ComplianceFinding(
                    element_type=el.element_type,
                    severity=severity,
                    regulation_refs=el.compliance_flags,
                    description=(
                        f"**{el.field_name}** ({el.element_type}) detected in codebase. "
                        f"Applicable regulations: {'; '.join(flag_descs)}."
                    ),
                    remediation=REMEDIATION_ADVICE.get(
                        el.element_type,
                        "Review data collection and ensure appropriate consent and notice.",
                    ),
                    affected_files=affected,
                )
            )
        # Sort: HIGH first, then MEDIUM, then LOW
        order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        findings.sort(key=lambda f: order.get(f.severity, 3))
        return findings

    def _severity(self, element_type: str) -> str:
        if element_type in HIGH_SENSITIVITY_TYPES:
            return "HIGH"
        if element_type in MEDIUM_SENSITIVITY_TYPES:
            return "MEDIUM"
        return "LOW"


# ---------------------------------------------------------------------------
# Optional PDF generation via WeasyPrint
# ---------------------------------------------------------------------------

def generate_pdf(report: AuditReport, out_path: str) -> bool:
    """Write PDF audit report. Returns True on success, False if WeasyPrint not available."""
    try:
        from weasyprint import HTML, CSS  # type: ignore
    except ImportError:
        log.warning("WeasyPrint not installed — PDF generation skipped. pip install weasyprint")
        return False

    md = report.to_markdown()
    # Minimal HTML wrapper; replace with full template in Day-5 polish
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body {{ font-family: sans-serif; margin: 2cm; color: #222; }}
  h1 {{ color: #1a56db; }} h2 {{ color: #374151; border-bottom: 1px solid #e5e7eb; }}
  table {{ border-collapse: collapse; width: 100%; }}
  td, th {{ border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }}
  code {{ background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85em; }}
  blockquote {{ border-left: 3px solid #f59e0b; margin: 0; padding: 0.5rem 1rem; background: #fffbeb; }}
</style>
</head><body>
<pre>{md}</pre>
</body></html>"""

    HTML(string=html).write_pdf(out_path)
    log.info("PDF written to %s", out_path)
    return True
