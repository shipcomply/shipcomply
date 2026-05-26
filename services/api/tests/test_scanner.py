"""Scanner tests — fixed field names from el.name -> el.element_type, result.scanned_files -> result.files_scanned."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from shipcomply_api.scanner import _is_excluded, scan_repo

SAMPLE = str(Path(__file__).parent.parent.parent.parent.parent / "examples" / "sample-nextjs-app")


def test_exclude_test_files():
    assert _is_excluded("src/signup.test.tsx")
    assert _is_excluded("__mocks__/email.ts")
    assert _is_excluded("node_modules/lib/index.ts")
    assert _is_excluded("app/utils.spec.ts")
    assert not _is_excluded("app/page.tsx")
    assert not _is_excluded("components/Form.tsx")
    assert not _is_excluded("app/actions.ts")


def test_exclude_build_dirs():
    assert _is_excluded(".next/server/app/page.js")
    assert _is_excluded("dist/index.js")
    assert _is_excluded("build/static/main.js")


def test_scan_sample_app_minimum_elements():
    result = scan_repo(SAMPLE)
    types = {el.element_type for el in result.data_elements}
    assert result.files_scanned > 0, "No files scanned"
    assert len(types) >= 5, f"Expected >=5 PII types, got {types}"
    assert "email" in types, "email not detected"
    assert "name" in types, "name not detected"
    assert "phone" in types, "phone not detected"
    assert "address" in types, "address not detected"
    assert "dob" in types, "dob not detected"


def test_scan_excludes_test_files():
    result = scan_repo(SAMPLE)
    for el in result.data_elements:
        for src in el.sources:
            assert ".test." not in src.file, f"Test file leaked: {src.file}"
            assert ".spec." not in src.file, f"Spec file leaked: {src.file}"
            assert "node_modules" not in src.file
