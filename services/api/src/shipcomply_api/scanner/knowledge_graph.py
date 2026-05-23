"""Knowledge Graph — maps DataElements to sources, sinks, and compliance regulations."""
from __future__ import annotations
from dataclasses import dataclass, field
from shipcomply_api.scanner import ScanResult


@dataclass
class KGNode:
    id: str
    type: str       # "data_element" | "file" | "service" | "regulation"
    label: str
    metadata: dict = field(default_factory=dict)


@dataclass
class KGEdge:
    source: str
    target: str
    relation: str   # "collected_in" | "sent_to" | "regulated_by"


@dataclass
class KnowledgeGraph:
    nodes: list[KGNode] = field(default_factory=list)
    edges: list[KGEdge] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "nodes": [vars(n) for n in self.nodes],
            "edges": [vars(e) for e in self.edges],
        }


def build_graph(scan: ScanResult) -> KnowledgeGraph:
    kg = KnowledgeGraph()
    seen_files: set[str] = set()
    seen_elements: set[str] = set()   # deduplicate element nodes
    seen_sinks: set[str] = set()      # deduplicate sink nodes

    for el in scan.data_elements:
        el_id = f"el:{el.element_type}"
        if el_id not in seen_elements:
            kg.nodes.append(KGNode(
                id=el_id,
                type="data_element",
                label=el.element_type,
                metadata={"field_name": el.field_name, "flags": el.compliance_flags},
            ))
            seen_elements.add(el_id)

        for src in el.sources:
            file_id = f"file:{src.file}"
            if file_id not in seen_files:
                kg.nodes.append(KGNode(id=file_id, type="file", label=src.file))
                seen_files.add(file_id)
            kg.edges.append(KGEdge(source=el_id, target=file_id, relation="collected_in"))

        for sink in el.sinks:
            sink_id = f"sink:{sink.type}:{sink.file}"
            if sink_id not in seen_sinks:
                kg.nodes.append(KGNode(id=sink_id, type="service", label=sink.type, metadata={"file": sink.file}))
                seen_sinks.add(sink_id)
            kg.edges.append(KGEdge(source=el_id, target=sink_id, relation="sent_to"))

        for flag in el.compliance_flags:
            reg_id = f"reg:{flag}"
            if not any(n.id == reg_id for n in kg.nodes):
                kg.nodes.append(KGNode(id=reg_id, type="regulation", label=flag))
            kg.edges.append(KGEdge(source=el_id, target=reg_id, relation="regulated_by"))

    return kg
