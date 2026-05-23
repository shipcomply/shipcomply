# Scanner: tree-sitter AST walk for PII detection

from __future__ import annotations
import logging
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

# Default paths to exclude from scanning
EXCLUDE_PATTERNS = {
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/__mocks__/**",
    "**/build/**",
    "**/__tests__/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
}


@dataclass
class DataElement:
    name: str
    type: str
    sources: list[dict] = field(default_factory=list)
    sinks: list[dict] = field(default_factory=list)
    compliance_flags: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    repo_path: str
    data_elements: list[DataElement] = field(default_factory=list)
    scanned_files: int = 0
    excluded_files: int = 0
    errors: list[str] = field(default_factory=list)


def scan_repo(repo_path: str) -> ScanResult:
    """Walk repo AST and detect PII data elements."""
    result = ScanResult(repo_path=repo_path)
    path = Path(repo_path)

    ts_files = list(path.rglob("*.ts")) + list(path.rglob("*.tsx")) + list(path.rglob("*.js"))

    for f in ts_files:
        rel = str(f.relative_to(path))
        if _is_excluded(rel):
            result.excluded_files += 1
            continue
        try:
            _scan_file(f, result)
            result.scanned_files += 1
        except Exception as e:
            log.warning("Failed to scan %s: %s", f, e)
            result.errors.append(str(f))

    return result


def _is_excluded(rel_path: str) -> bool:
    from pathlib import PurePosixPath
    p = PurePosixPath(rel_path.replace("\\", "/"))
    for part in p.parts:
        if part in ("node_modules", "dist", ".next", "build", "__mocks__"):
            return True
    name = p.name
    for suffix in (".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".spec.js"):
        if name.endswith(suffix):
            return True
    return False


def _scan_file(path: Path, result: ScanResult) -> None:
    """Basic pattern-based scan; tree-sitter AST walk wired in Day-1."""
    content = path.read_text(encoding="utf-8", errors="ignore")

    pii_patterns = {
        "email": ["email", "e_mail", "emailAddress", "userEmail"],
        "phone": ["phone", "phoneNumber", "mobile", "mobileNumber"],
        "name": ["firstName", "lastName", "fullName", "userName"],
        "address": ["address", "streetAddress", "postalCode", "zipCode"],
        "dob": ["dateOfBirth", "birthDate", "dob"],
        "pan": ["panNumber", "pan_number"],
        "aadhaar": ["aadhaar", "aadharNumber"],
    }

    for pii_type, patterns in pii_patterns.items():
        for pattern in patterns:
            if pattern.lower() in content.lower():
                existing = next(
                    (e for e in result.data_elements if e.name == pii_type), None
                )
                if not existing:
                    result.data_elements.append(
                        DataElement(
                            name=pii_type,
                            type="personal",
                            sources=[{"file": str(path), "pattern": pattern}],
                            compliance_flags=["DPDP_S4", "GDPR_A5"],
                        )
                    )
                break
