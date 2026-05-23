"""Tests for Audit Agent."""
import pytest
from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
from shipcomply_api.audit import AuditAgent, AuditReport


def _el(etype, fname, flags, file="app/page.tsx", line=10):
    return DataElement(
        element_type=etype,
        field_name=fname,
        compliance_flags=flags,
        sources=[ElementSource(file=file, line=line, pattern="jsx_input")],
    )


def _make_scan(*elements, scan_id="test-audit", files=5):
    return ScanResult(
        data_elements=list(elements),
        files_scanned=files,
        scan_id=scan_id,
    )


class TestAuditAgent:
    def test_empty_scan_scores_na(self):
        agent = AuditAgent()
        scan = ScanResult(data_elements=[], files_scanned=0, scan_id="empty")
        report = agent.audit(scan)
        assert report.score is None
        assert report.score_label == "N/A"

    def test_zero_files_scores_na(self):
        agent = AuditAgent()
        scan = _make_scan(_el("email","email",["DPDP_S4"]), files=0)
        report = agent.audit(scan)
        assert report.score is None

    def test_high_sensitivity_deducts_20(self):
        agent = AuditAgent()
        scan = _make_scan(_el("aadhaar","aadhaar",["DPDP_S4","DPDP_S9"]))
        report = agent.audit(scan)
        assert report.score == 80

    def test_medium_sensitivity_deducts_10(self):
        agent = AuditAgent()
        scan = _make_scan(_el("email","email",["DPDP_S4"]))
        report = agent.audit(scan)
        assert report.score == 90

    def test_score_never_below_zero(self):
        agent = AuditAgent()
        elements = [
            _el("aadhaar","aadhaar",["DPDP_S9"]),
            _el("pan","pan",["DPDP_S9"]),
            _el("ssn","ssn",["GDPR_A9"]),
            _el("payment","card",["PCI_DSS"]),
            _el("email","email",["DPDP_S4"]),
            _el("phone","phone",["DPDP_S4"]),
        ]
        scan = _make_scan(*elements)
        report = agent.audit(scan)
        assert report.score >= 0

    def test_findings_sorted_high_first(self):
        agent = AuditAgent()
        scan = _make_scan(
            _el("email","email",["DPDP_S4"]),
            _el("aadhaar","aadhaar",["DPDP_S9"]),
        )
        report = agent.audit(scan)
        assert report.findings[0].severity == "HIGH"

    def test_findings_include_affected_files(self):
        agent = AuditAgent()
        scan = _make_scan(_el("email","email",["DPDP_S4"], file="app/form.tsx", line=42))
        report = agent.audit(scan)
        assert any("app/form.tsx:42" in f.affected_files for f in report.findings)

    def test_markdown_contains_disclaimer(self):
        agent = AuditAgent()
        report = agent.audit(_make_scan(_el("email","email",["DPDP_S4"])))
        md = report.to_markdown()
        assert "AI-GENERATED DRAFT" in md

    def test_markdown_contains_managed_marker(self):
        agent = AuditAgent()
        report = agent.audit(_make_scan(_el("email","email",["DPDP_S4"])))
        md = report.to_markdown()
        assert "shipcomply-managed:" in md

    def test_markdown_contains_score(self):
        agent = AuditAgent()
        report = agent.audit(_make_scan(_el("email","email",["DPDP_S4"])))
        md = report.to_markdown()
        assert "90/100" in md

    def test_na_markdown_explains_na(self):
        agent = AuditAgent()
        scan = ScanResult(data_elements=[], files_scanned=0, scan_id="empty")
        report = agent.audit(scan)
        md = report.to_markdown()
        assert "N/A" in md

    def test_score_label_excellent(self):
        agent = AuditAgent()
        scan = _make_scan(_el("analytics","gtag",["GDPR_A5_1_A"]))  # LOW: -5 -> 95
        report = agent.audit(scan)
        assert report.score_label == "Excellent"

    def test_to_dict_serializable(self):
        import json
        agent = AuditAgent()
        report = agent.audit(_make_scan(_el("email","email",["DPDP_S4"])))
        json.dumps(report.to_dict())
