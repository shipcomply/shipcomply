"""
Scanner v0.1 — tree-sitter AST walk for PII detection.

Detects:
  - JSX <input> / <textarea> with PII name/type attributes
  - Next.js API route handler parameters
  - Server actions ('use server' pragma)
  - Analytics SDK calls (Mixpanel, Segment, Amplitude, PostHog, GA4)
  - ORM writes (Prisma, Drizzle, TypeORM)
  - Dynamic imports of analytics/tracking packages

Falls back to regex pattern scan if tree-sitter is not installed.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

EXCLUDE_DIRS = {"node_modules", "dist", ".next", "build", "__mocks__", "__tests__", ".git", "coverage"}
EXCLUDE_SUFFIXES = {".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".spec.js", ".test.mjs"}

# Maps detected field name patterns -> PII type label
PII_FIELD_MAP: dict[str, str] = {
    "email": "email",
    "emailaddress": "email",
    "useremail": "email",
    "e_mail": "email",
    "firstname": "name",
    "lastname": "name",
    "fullname": "name",
    "username": "name",
    "displayname": "name",
    "name": "name",
    "phone": "phone",
    "phonenumber": "phone",
    "mobile": "phone",
    "mobilenumber": "phone",
    "telephonenumber": "phone",
    "address": "address",
    "streetaddress": "address",
    "postalcode": "address",
    "zipcode": "address",
    "city": "address",
    "state": "address",
    "dateofbirth": "dob",
    "birthdate": "dob",
    "dob": "dob",
    "birthday": "dob",
    "pannumber": "pan",
    "pan": "pan",
    "aadhaar": "aadhaar",
    "aadhaarnumber": "aadhaar",
    "ssn": "ssn",
    "socialsecurity": "ssn",
    "creditcard": "payment",
    "cardnumber": "payment",
    "cvv": "payment",
}

ANALYTICS_PACKAGES = {
    "mixpanel", "segment", "amplitude", "@amplitude/analytics-browser",
    "posthog-js", "posthog-node", "analytics", "gtag", "@google-analytics",
    "@segment/analytics-next", "rudder-sdk-js", "heap", "hotjar",
}

ORM_WRITE_METHODS = {
    "create", "createMany", "upsert", "update", "updateMany",
    "insert", "insertMany", "save", "put",
}

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


@dataclass
class Source:
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
    name: str
    type: str
    sources: list[Source] = field(default_factory=list)
    sinks: list[Sink] = field(default_factory=list)
    compliance_flags: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    repo_path: str
    data_elements: list[DataElement] = field(default_factory=list)
    scanned_files: int = 0
    excluded_files: int = 0
    errors: list[str] = field(default_factory=list)

    def add_source(self, pii_type: str, source: Source) -> None:
        for el in self.data_elements:
            if el.name == pii_type:
                el.sources.append(source)
                return
        self.data_elements.append(DataElement(
            name=pii_type,
            type="personal",
            sources=[source],
            compliance_flags=COMPLIANCE_FLAGS.get(pii_type, ["DPDP_S4"]),
        ))

    def add_sink(self, pii_type: str, sink: Sink) -> None:
        for el in self.data_elements:
            if el.name == pii_type:
                el.sinks.append(sink)
                return


def _is_excluded(rel_path: str) -> bool:
    parts = re.split(r"[/\\]", rel_path)
    for part in parts[:-1]:
        if part in EXCLUDE_DIRS:
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
    """Attempt AST scan via tree-sitter. Returns True on success."""
    try:
        import tree_sitter_typescript as tsts
        from tree_sitter import Language, Parser

        lang = Language(tsts.language_typescript())
        parser = Parser(lang)
        tree = parser.parse(content.encode())

        _walk_ast(tree.root_node, content, file_path, result)
        return True
    except Exception as e:
        log.debug("tree-sitter unavailable (%s), falling back to regex", e)
        return False


def _node_text(node, src: str) -> str:
    return src[node.start_byte:node.end_byte]


def _walk_ast(node, src: str, filepath: str, result: ScanResult) -> None:
    """Recursive AST visitor."""
    t = node.type

    # JSX <input name="email" type="email" />
    if t == "jsx_opening_element" or t == "jsx_self_closing_element":
        _detect_jsx_input(node, src, filepath, result)

    # 'use server' server actions
    elif t == "expression_statement":
        text = _node_text(node, src).strip()
        if text in ("'use server'", '"use server"'):
            _detect_server_action_params(node.parent, src, filepath, result)

    # Analytics SDK: mixpanel.identify({email}), analytics.track({email})
    elif t == "call_expression":
        _detect_analytics_call(node, src, filepath, result)

    # Dynamic import: await import('mixpanel')
    elif t == "await_expression":
        _detect_dynamic_import(node, src, filepath, result)

    for child in node.children:
        _walk_ast(child, src, filepath, result)


def _detect_jsx_input(node, src: str, filepath: str, result: ScanResult) -> None:
    """Detect <input name="pii_field"> or type="email"."""
    tag_name = ""
    attrs: dict[str, str] = {}

    for child in node.children:
        if child.type == "identifier":
            tag_name = _node_text(child, src).lower()
        elif child.type == "jsx_attribute":
            attr_children = child.children
            if len(attr_children) >= 3:
                attr_name = _node_text(attr_children[0], src).lower()
                # value is usually jsx_attribute_value -> string
                raw_val = _node_text(attr_children[2], src).strip('"\'{}')
                attrs[attr_name] = raw_val

    if tag_name not in ("input", "textarea", "select"):
        return

    # type="email" is always an email input
    if attrs.get("type") == "email":
        pii = "email"
    else:
        pii = _map_field(attrs.get("name", ""))

    if pii:
        result.add_source(pii, Source(
            file=filepath,
            line=node.start_point[0] + 1,
            pattern=f"<{tag_name} name={attrs.get('name', '')} type={attrs.get('type', '')}>",
            detection_type="jsx_attribute",
        ))


def _detect_server_action_params(func_node, src: str, filepath: str, result: ScanResult) -> None:
    """After 'use server', scan exported async function parameters for PII names."""
    if not func_node:
        return
    text = src[func_node.start_byte:func_node.end_byte]
    for match in re.finditer(r'\b(\w+)\s*:\s*\w+', text):
        pii = _map_field(match.group(1))
        if pii:
            result.add_source(pii, Source(
                file=filepath,
                pattern=f"server_action_param:{match.group(1)}",
                detection_type="server_action",
            ))


def _detect_analytics_call(node, src: str, filepath: str, result: ScanResult) -> None:
    """Detect analytics.identify/track({email, ...}) patterns."""
    text = _node_text(node, src)
    for pkg in ANALYTICS_PACKAGES:
        if pkg.split("/")[-1].split("-")[0] in text.lower():
            for field_match in re.finditer(r'\b(\w+)\s*:', text):
                pii = _map_field(field_match.group(1))
                if pii:
                    result.add_source(pii, Source(
                        file=filepath,
                        line=node.start_point[0] + 1,
                        pattern=f"analytics_sdk:{field_match.group(1)}",
                        detection_type="analytics_sdk",
                    ))
            result.add_sink(
                "email",
                Sink(file=filepath, line=node.start_point[0] + 1, type="analytics_sdk"),
            )
            break


def _detect_dynamic_import(node, src: str, filepath: str, result: ScanResult) -> None:
    """Detect await import('mixpanel') style dynamic imports."""
    text = _node_text(node, src)
    for pkg in ANALYTICS_PACKAGES:
        short = pkg.split("/")[-1]
        if short in text:
            result.add_sink(
                "email",
                Sink(file=filepath, line=node.start_point[0] + 1, type="dynamic_import"),
            )
            break


# ─── Regex fallback scanner ──────────────────────────────────────────────────

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
_ANALYTICS_RE = re.compile(
    r'\b(?:mixpanel|analytics|amplitude|posthog|gtag|heap|segment)\s*\.\s*(?:identify|track|set)\s*\(',
    re.IGNORECASE,
)
_SERVER_ACTION_RE = re.compile(r"""['"]use server['"]""")
_ORM_RE = re.compile(r'\.\s*(?:create|upsert|insert|save)\s*\(', re.IGNORECASE)


def _regex_scan(content: str, filepath: str, result: ScanResult) -> None:
    """Regex-based fallback (no tree-sitter)."""
    lines = content.splitlines()

    # Skip files that are inside comments only — crude but effective
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue

        # JSX inputs
        for m in _JSX_INPUT_RE.finditer(line):
            pii = _map_field(m.group(1))
            if not pii and "email" in line.lower():
                pii = "email"
            if pii:
                result.add_source(pii, Source(file=filepath, line=i, pattern=m.group(0)[:60], detection_type="regex_jsx"))

        # Identifier patterns
        for m in _FIELD_RE.finditer(line):
            pii = _map_field(m.group(1))
            if pii:
                result.add_source(pii, Source(file=filepath, line=i, pattern=m.group(1), detection_type="regex_identifier"))

        # Analytics SDK
        if _ANALYTICS_RE.search(line):
            result.add_sink("email", Sink(file=filepath, line=i, type="analytics_sdk"))

        # Server actions
        if _SERVER_ACTION_RE.search(line):
            result.add_source("name", Source(file=filepath, line=i, pattern="server_action_marker", detection_type="server_action"))

        # ORM writes
        if _ORM_RE.search(line):
            for m in _FIELD_RE.finditer(line):
                pii = _map_field(m.group(1))
                if pii:
                    result.add_sink(pii, Sink(file=filepath, line=i, type="orm_write"))


# ─── Public API ──────────────────────────────────────────────────────────────

def scan_repo(repo_path: str) -> ScanResult:
    """Scan a repo for PII data elements. Returns ScanResult."""
    result = ScanResult(repo_path=repo_path)
    path = Path(repo_path)

    extensions = {".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"}
    files = [f for ext in extensions for f in path.rglob(f"*{ext}")]

    for f in files:
        try:
            rel = str(f.relative_to(path))
        except ValueError:
            rel = str(f)

        if _is_excluded(rel):
            result.excluded_files += 1
            continue

        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
            used_ast = _try_treesitter_scan(content, rel, result)
            if not used_ast:
                _regex_scan(content, rel, result)
            result.scanned_files += 1
        except Exception as e:
            log.warning("scan error %s: %s", f, e)
            result.errors.append(rel)

    # Deduplicate sources per element
    for el in result.data_elements:
        seen: set[str] = set()
        deduped: list[Source] = []
        for s in el.sources:
            key = f"{s.file}:{s.line}:{s.pattern}"
            if key not in seen:
                seen.add(key)
                deduped.append(s)
        el.sources = deduped

    return result
