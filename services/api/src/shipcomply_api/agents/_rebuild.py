"""Canonical helper — reconstructs a ScanResult-like object from serialised ScanState."""
from __future__ import annotations
from dataclasses import dataclass, field as dc_field


@dataclass
class _Src:
    file: str
    line: object = None
    pattern: object = None
    detection_type: str = "pattern"


@dataclass
class _El:
    element_type: str
    field_name: str = ""
    sources: list = dc_field(default_factory=list)
    sinks: list = dc_field(default_factory=list)
    compliance_flags: list = dc_field(default_factory=list)


@dataclass
class _Scan:
    scan_id: str
    data_elements: list
    files_scanned: int = 0
    errors: list = dc_field(default_factory=list)


def rebuild_scan(state: dict) -> _Scan:
    """Reconstruct a _Scan from ScanState dict preserving sources and sinks."""
    elements = []
    for el in state.get("data_elements", []):
        sources = [
            _Src(**{k: v for k, v in s.items() if k in ("file", "line", "pattern", "detection_type")})
            for s in el.get("sources", [])
        ]
        sinks = [
            _Src(**{k: v for k, v in s.items() if k in ("file", "line", "pattern", "detection_type")})
            for s in el.get("sinks", [])
        ]
        elements.append(_El(
            element_type=el["element_type"],
            field_name=el.get("field_name", ""),
            compliance_flags=el.get("compliance_flags", []),
            sources=sources,
            sinks=sinks,
        ))
    return _Scan(
        scan_id=state["scan_id"],
        data_elements=elements,
        files_scanned=state.get("files_scanned", 0),
    )
