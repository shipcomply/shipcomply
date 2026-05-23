"""Legal Writer tests — no LLM or DB required."""
import pytest
from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
from shipcomply_api.legal_writer import PolicyGenerator, DISCLAIMER


def _make_scan(elements=None, scan_id="test-scan") -> ScanResult:
    if elements is None:
        elements = [
            DataElement(
                element_type="email",
                field_name="email",
                compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                sources=[ElementSource(file="app/page.tsx", line=10, pattern="jsx_input")],
            ),
            DataElement(
                element_type="phone",
                field_name="phone",
                compliance_flags=["DPDP_S4"],
                sources=[ElementSource(file="app/page.tsx", line=15, pattern="jsx_input")],
            ),
            DataElement(
                element_type="name",
                field_name="firstName",
                compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                sources=[ElementSource(file="lib/actions.ts", line=5, pattern="server_action")],
            ),
        ]
    return ScanResult(data_elements=elements, files_scanned=3, scan_id=scan_id)


class TestPolicyGenerator:
    def test_generate_returns_policy(self):
        gen = PolicyGenerator()
        scan = _make_scan()
        policy = gen.generate(scan, jurisdiction="DPDP")
        assert policy.scan_id == "test-scan"
        assert policy.jurisdiction == "DPDP"
        assert len(policy.sections) > 0

    def test_policy_has_minimum_sections(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        titles = [s.title for s in policy.sections]
        assert "What Data We Collect" in titles
        assert "Your Rights" in titles
        assert "Contact Us" in titles

    def test_policy_has_citations(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        total_citations = sum(len(s.citations) for s in policy.sections)
        assert total_citations >= 3, f"Expected >=3 citations, got {total_citations}"

    def test_citations_contain_file_and_line(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        for section in policy.sections:
            for cite in section.citations:
                assert ":" in cite, f"Citation missing line number: {cite}"
                parts = cite.rsplit(":", 1)
                assert parts[-1].isdigit(), f"Citation line not numeric: {cite}"

    def test_markdown_contains_disclaimer(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        md = policy.to_markdown()
        assert "AI-GENERATED DRAFT" in md
        assert "REVIEW BY QUALIFIED ATTORNEY" in md

    def test_markdown_contains_managed_comment(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        md = policy.to_markdown()
        assert "shipcomply-managed:" in md

    def test_confidence_scores_in_range(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        for section in policy.sections:
            assert 0 <= section.confidence <= 100, f"Confidence out of range: {section.confidence}"

    def test_gdpr_jurisdiction(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="GDPR")
        titles = [s.title for s in policy.sections]
        assert "Legal Basis for Processing" in titles
        assert "Security Measures" in titles

    def test_ccpa_jurisdiction(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="CCPA")
        titles = [s.title for s in policy.sections]
        assert "Right to Delete" in titles
        assert "Right to Opt-Out" in titles

    def test_to_dict_serializable(self):
        import json
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan())
        d = policy.to_dict()
        json.dumps(d)  # must not raise
        assert "sections" in d
        assert len(d["sections"]) > 0

    def test_empty_scan_no_citations_but_generates(self):
        gen = PolicyGenerator()
        scan = ScanResult(data_elements=[], files_scanned=0, scan_id="empty")
        policy = gen.generate(scan, jurisdiction="DPDP")
        assert len(policy.sections) > 0
        md = policy.to_markdown()
        assert "Privacy Policy" in md

    def test_regulation_refs_match_jurisdiction(self):
        gen = PolicyGenerator()
        policy = gen.generate(_make_scan(), jurisdiction="DPDP")
        for section in policy.sections:
            assert "DPDP" in section.regulation_ref, f"Wrong ref for DPDP: {section.regulation_ref}"
