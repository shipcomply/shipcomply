"""Tests for Code Generator — no LLM or DB required."""
import pytest
from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
from shipcomply_api.code_gen import CodeGenerator


def _make_scan(scan_id="test-codegen") -> ScanResult:
    return ScanResult(
        data_elements=[
            DataElement(
                element_type="email",
                field_name="email",
                compliance_flags=["DPDP_S4"],
                sources=[ElementSource(file="app/page.tsx", line=10, pattern="jsx_input")],
            ),
            DataElement(
                element_type="phone",
                field_name="phone",
                compliance_flags=["DPDP_S4"],
                sources=[ElementSource(file="app/page.tsx", line=15, pattern="jsx_input")],
            ),
        ],
        files_scanned=3,
        scan_id=scan_id,
    )


class TestCodeGenerator:
    def test_generates_three_files(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        assert len(result.files) == 3

    def test_generates_consent_banner(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        filenames = [f.filename for f in result.files]
        assert "ConsentBanner.tsx" in filenames

    def test_generates_consent_route(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        filenames = [f.filename for f in result.files]
        assert "consent.ts" in filenames

    def test_generates_user_data_route(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        filenames = [f.filename for f in result.files]
        assert "user-data.ts" in filenames

    def test_all_files_have_disclaimer(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        for f in result.files:
            assert "AI-GENERATED DRAFT" in f.content, f"{f.filename} missing disclaimer"

    def test_all_files_have_managed_marker(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        for f in result.files:
            assert "shipcomply-managed:" in f.content, f"{f.filename} missing managed marker"
            assert "test-codegen" in f.content

    def test_consent_banner_includes_pii_types(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        banner = next(f for f in result.files if f.filename == "ConsentBanner.tsx")
        assert "email" in banner.content
        assert "phone" in banner.content

    def test_user_data_route_includes_pii_types(self):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        data_route = next(f for f in result.files if f.filename == "user-data.ts")
        assert "email" in data_route.content

    def test_collision_renames_file(self, tmp_path):
        gen = CodeGenerator()
        # Pre-create the target file to trigger collision
        banner_path = tmp_path / "components" / "ConsentBanner.tsx"
        banner_path.parent.mkdir(parents=True)
        banner_path.write_text("// existing file")

        result = gen.generate(_make_scan(), target_path=str(tmp_path))
        banner = next(f for f in result.files if "ConsentBanner" in f.filename)
        assert banner.collision is True
        assert "shipcomply-" in banner.path

    def test_no_collision_without_existing_files(self, tmp_path):
        gen = CodeGenerator()
        result = gen.generate(_make_scan(), target_path=str(tmp_path))
        for f in result.files:
            assert f.collision is False

    def test_write_to_disk_creates_files(self, tmp_path):
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        written = gen.write_to_disk(result, str(tmp_path))
        assert len(written) == 3
        for path in written:
            assert os.path.exists(path)

    def test_to_dict_serializable(self):
        import json
        gen = CodeGenerator()
        result = gen.generate(_make_scan())
        d = result.to_dict()
        json.dumps(d)
        assert "files" in d
        assert len(d["files"]) == 3


import os
