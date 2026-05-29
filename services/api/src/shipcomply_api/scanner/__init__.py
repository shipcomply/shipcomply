"""
Scanner v0.2 — tree-sitter AST walk for PII detection.

Schema (canonical — all consumers must match):
  ElementSource(file, line, pattern, detection_type)
  DataElement(element_type, field_name, sources, sinks, compliance_flags)
  ScanResult(repo_path, scan_id, data_elements, files_scanned, excluded_files, errors)
"""
from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

EXCLUDE_DIRS = {"node_modules", "dist", ".next", "build", "__mocks__", "__tests__", ".git", "coverage"}
EXCLUDE_SUFFIXES = {".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".spec.js", ".test.mjs"}
MAX_FILE_BYTES = 1_000_000   # skip files >1 MB (minified bundles / binary)
MAX_AST_DEPTH  = 500         # prevent RecursionError on deep synthetic ASTs

PII_FIELD_MAP: dict[str, str] = {
    "email": "email", "emailaddress": "email", "useremail": "email", "e_mail": "email",
    "firstname": "name", "lastname": "name", "fullname": "name", "username": "name",
    "displayname": "name", "name": "name",
    "phone": "phone", "phonenumber": "phone", "mobile": "phone",
    "mobilenumber": "phone", "telephonenumber": "phone",
    "address": "address", "streetaddress": "address", "postalcode": "address",
    "zipcode": "address", "city": "address", "state": "address",
    "dateofbirth": "dob", "birthdate": "dob", "dob": "dob", "birthday": "dob",
    "pannumber": "pan", "pan": "pan",
    "aadhaar": "aadhaar", "aadhaarnumber": "aadhaar",
    "ssn": "ssn", "socialsecurity": "ssn",
    "creditcard": "payment", "cardnumber": "payment", "cvv": "payment",
}

ANALYTICS_PACKAGES = {
    "mixpanel", "segment", "amplitude", "@amplitude/analytics-browser",
    "posthog-js", "posthog-node", "analytics", "gtag", "@google-analytics",
    "@segment/analytics-next", "rudder-sdk-js", "heap", "hotjar",
}

ORM_WRITE_METHODS = {"create", "createMany", "upsert", "update", "updateMany", "insert", "insertMany", "save", "put"}

COMPLIANCE_FLAGS: dict[str, list[str]] = {
    "email":   ["DPDP_S4", "DPDP_S7", "GDPR_A5_1_A", "GDPR_A13"],
    "name":    ["DPDP_S4", "GDPR_A5_1_A"],
    "phone":   ["DPDP_S4", "GDPR_A5_1_A"],
    "address": ["DPDP_S4", "GDPR_A5_1_A"],
    "dob":     ["DPDP_S4", "GDPR_A5_1_B", "GDPR_A9"],
    "pan":     ["DPDP_S4", "DPDP_S9", "GDPR_A9"],
    "aadhaar": ["DPDP_S4", "DPDP_S9", "GDPR_A9"],
    "ssn":     ["GDPR_A9", "CCPA_S1798_140"],
    "payment": ["DPDP_S4", "DPDP_S9", "GDPR_A9", "PCI_DSS"],
}


# ---------------------------------------------------------------------------
# Canonical dataclasses — DO NOT rename fields without updating all consumers
# ---------------------------------------------------------------------------

@dataclass
class ElementSource:
    file: str
    line: int | None = None
    pattern: str | None = None
    detection_type: str = "pattern"


@dataclass
class Sink:
    file: str
    line: int | None = None
    type: str = "unknown"


@dataclass
class DataElement:
    element_type: str          # PII category: "email", "phone", "name", ...
    field_name: str = ""       # original field name from code: "emailAddress", "phone_number"
    sources: list[ElementSource] = field(default_factory=list)
    sinks: list[Sink] = field(default_factory=list)
    compliance_flags: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    repo_path: str
    scan_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    data_elements: list[DataElement] = field(default_factory=list)
    files_scanned: int = 0
    excluded_files: int = 0
    errors: list[str] = field(default_factory=list)

    def add_source(self, pii_type: str, src: ElementSource, field_name: str = "") -> None:
        for el in self.data_elements:
            if el.element_type == pii_type:
                el.sources.append(src)
                if field_name and not el.field_name:
                    el.field_name = field_name
                return
        self.data_elements.append(DataElement(
            element_type=pii_type,
            field_name=field_name,
            sources=[src],
            compliance_flags=COMPLIANCE_FLAGS.get(pii_type, ["DPDP_S4"]),
        ))

    def add_sink(self, pii_type: str, sink: Sink) -> None:
        for el in self.data_elements:
            if el.element_type == pii_type:
                el.sinks.append(sink)
                return


def _is_excluded(rel_path: str) -> bool:
    parts = re.split(r"[/\\]", rel_path)
    # Check ALL parts (including filename) for excluded dirs — case-insensitive
    for part in parts[:-1]:
        if part.lower() in EXCLUDE_DIRS:
            return True
    name = parts[-1]
    for suffix in EXCLUDE_SUFFIXES:
        if name.endswith(suffix):
            return True
    return False


def _map_field(raw: str) -> str | None:
    key = raw.lower().replace("-", "").replace("_", "")
    return PII_FIELD_MAP.get(key)


# ─── Tree-sitter AST scanner ─────────────────────────────────────────────────

def _try_treesitter_scan(content: str, file_path: str, result: ScanResult) -> bool:
    try:
        import tree_sitter_typescript as tsts
        from tree_sitter import Language, Parser
        lang = Language(tsts.language_typescript())
        parser = Parser(lang)
        tree = parser.parse(content.encode())
        _walk_ast(tree.root_node, content, file_path, result, depth=0)
        return True
    except Exception as e:
        log.debug("tree-sitter unavailable (%s), falling back to regex", e)
        return False


def _node_text(node, src: str) -> str:
    return src[node.start_byte:node.end_byte]


def _walk_ast(node, src: str, filepath: str, result: ScanResult, depth: int) -> None:
    if depth > MAX_AST_DEPTH:
        return
    t = node.type

    if t in ("jsx_opening_element", "jsx_self_closing_element"):
        _detect_jsx_input(node, src, filepath, result)
    elif t == "expression_statement":
        text = _node_text(node, src).strip()
        if text in ("'use server'", '"use server"'):
            _detect_server_action_params(node.parent, src, filepath, result)
    elif t == "call_expression":
        _detect_analytics_call(node, src, filepath, result)
    elif t == "await_expression":
        _detect_dynamic_import(node, src, filepath, result)

    for child in node.children:
        _walk_ast(child, src, filepath, result, depth + 1)


def _detect_jsx_input(node, src: str, filepath: str, result: ScanResult) -> None:
    tag_name = ""
    attrs: dict[str, str] = {}

    for child in node.children:
        if child.type == "identifier":
            tag_name = _node_text(child, src).lower()
        elif child.type == "jsx_attribute":
            attr_children = child.children
            if len(attr_children) >= 3:
                attr_name = _node_text(attr_children[0], src).lower()
                raw_val = _node_text(attr_children[2], src).strip('"\'{}')
                attrs[attr_name] = raw_val

    if tag_name not in ("input", "textarea", "select"):
        return

    if attrs.get("type") == "email":
        pii = "email"
        raw_field = "email"
    else:
        raw_field = attrs.get("name", "")
        pii = _map_field(raw_field)

    if pii:
        result.add_source(pii, ElementSource(
            file=filepath,
            line=node.start_point[0] + 1,
            pattern=f"<{tag_name} name={attrs.get('name', '')} type={attrs.get('type', '')}>",
            detection_type="jsx_attribute",
        ), field_name=raw_field)


def _detect_server_action_params(func_node, src: str, filepath: str, result: ScanResult) -> None:
    if not func_node:
        return
    text = src[func_node.start_byte:func_node.end_byte]
    for match in re.finditer(r'\b(\w+)\s*:\s*\w+', text):
        raw = match.group(1)
        pii = _map_field(raw)
        if pii:
            result.add_source(pii, ElementSource(
                file=filepath,
                pattern=f"server_action_param:{raw}",
                detection_type="server_action",
            ), field_name=raw)


def _detect_analytics_call(node, src: str, filepath: str, result: ScanResult) -> None:
    text = _node_text(node, src)
    for pkg in ANALYTICS_PACKAGES:
        if pkg.split("/")[-1].split("-")[0] in text.lower():
            for field_match in re.finditer(r'\b(\w+)\s*:', text):
                raw = field_match.group(1)
                pii = _map_field(raw)
                if pii:
                    result.add_source(pii, ElementSource(
                        file=filepath,
                        line=node.start_point[0] + 1,
                        pattern=f"analytics_sdk:{raw}",
                        detection_type="analytics_sdk",
                    ), field_name=raw)
            result.add_sink("email", Sink(file=filepath, line=node.start_point[0] + 1, type="analytics_sdk"))
            break


def _detect_dynamic_import(node, src: str, filepath: str, result: ScanResult) -> None:
    text = _node_text(node, src)
    for pkg in ANALYTICS_PACKAGES:
        if pkg.split("/")[-1] in text:
            result.add_sink("email", Sink(file=filepath, line=node.start_point[0] + 1, type="dynamic_import"))
            break


# ─── Regex fallback ──────────────────────────────────────────────────────────

_JSX_INPUT_RE = re.compile(
    r'<(?:input|textarea|select)[^>]*(?:name|type)=["\']([^"\']+)["\'][^>]*/?>',
    re.IGNORECASE,
)
_FIELD_RE = re.compile(
    r'\b(email|emailAddress|firstName|lastName|fullName|phone|phoneNumber|mobile|'
    r'address|streetAddress|postalCode|zipCode|dateOfBirth|birthDate|dob|'
    r'panNumber|aadhaar|ssn|creditCard|cardNumber)\b',
    re.IGNORECASE,
)
_ANALYTICS_RE  = re.compile(r'\b(?:mixpanel|analytics|amplitude|posthog|gtag|heap|segment)\s*\.\s*(?:identify|track|set)\s*\(', re.IGNORECASE)
_SERVER_ACTION_RE = re.compile(r"""['"]use server['"]""")
_ORM_RE = re.compile(r'\.\s*(?:create|upsert|insert|save)\s*\(', re.IGNORECASE)


def _regex_scan(content: str, filepath: str, result: ScanResult) -> None:
    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue

        for m in _JSX_INPUT_RE.finditer(line):
            raw = m.group(1)
            pii = _map_field(raw)
            if not pii and "email" in line.lower():
                pii = "email"
                raw = "email"
            if pii:
                result.add_source(pii, ElementSource(file=filepath, line=i, pattern=m.group(0)[:60], detection_type="regex_jsx"), field_name=raw)

        for m in _FIELD_RE.finditer(line):
            raw = m.group(1)
            pii = _map_field(raw)
            if pii:
                result.add_source(pii, ElementSource(file=filepath, line=i, pattern=raw, detection_type="regex_identifier"), field_name=raw)

        if _ANALYTICS_RE.search(line):
            result.add_sink("email", Sink(file=filepath, line=i, type="analytics_sdk"))

        if _SERVER_ACTION_RE.search(line):
            result.add_source("name", ElementSource(file=filepath, line=i, pattern="server_action_marker", detection_type="server_action"))

        if _ORM_RE.search(line):
            for m in _FIELD_RE.finditer(line):
                raw = m.group(1)
                pii = _map_field(raw)
                if pii:
                    result.add_sink(pii, Sink(file=filepath, line=i, type="orm_write"))


# ─── Public API ──────────────────────────────────────────────────────────────

def _detection_count(result: ScanResult) -> int:
    """Total source + sink hits across all elements — used to tell whether a scan
    pass actually detected anything in a file."""
    return sum(len(el.sources) + len(el.sinks) for el in result.data_elements)


def scan_repo(repo_path: str) -> ScanResult:
    """Scan a directory for PII data elements. repo_path must be an existing directory."""
    path = Path(repo_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"scan_repo: path does not exist: {repo_path!r}")
    if not path.is_dir():
        raise NotADirectoryError(f"scan_repo: not a directory: {repo_path!r}")

    result = ScanResult(repo_path=str(path))
    extensions = {".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"}

    # Single rglob pass — filter by suffix, skip symlinks to avoid loops
    files = [
        f for f in path.rglob("*")
        if f.suffix in extensions and not f.is_symlink()
    ]

    for f in files:
        try:
            rel = str(f.relative_to(path))
        except ValueError:
            rel = str(f)

        if _is_excluded(rel):
            result.excluded_files += 1
            continue

        # Skip large files (minified bundles)
        try:
            if f.stat().st_size > MAX_FILE_BYTES:
                log.debug("skipping large file %s", rel)
                result.excluded_files += 1
                continue
        except OSError:
            continue

        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
            # Crude binary detection: null bytes in first 512 chars
            if "\x00" in content[:512]:
                result.excluded_files += 1
                continue
            before = _detection_count(result)
            used_ast = _try_treesitter_scan(content, rel, result)
            # AST detectors only cover JSX inputs, analytics calls and server-action
            # params, and the TS grammar misses .tsx JSX + bare field identifiers.
            # Fall back to the comprehensive regex scan whenever the AST pass found
            # nothing in this file, so detection never silently regresses to zero.
            if not used_ast or _detection_count(result) == before:
                _regex_scan(content, rel, result)
            result.files_scanned += 1
        except Exception as e:
            log.warning("scan error %s: %s", f, e)
            result.errors.append(rel)

    # Deduplicate sources per element
    for el in result.data_elements:
        seen: set[str] = set()
        deduped: list[ElementSource] = []
        for s in el.sources:
            key = f"{s.file}:{s.line}:{s.pattern}"
            if key not in seen:
                seen.add(key)
                deduped.append(s)
        el.sources = deduped

    return result
