"""Knowledge Graph: builds edges from ScanResult (elements -> sources -> sinks -> compliance rules)."""
from __future__ import annotations
from dataclasses import dataclass, field
from shipcomply_api.scanner import ScanResult, DataElement


@dataclass
class KGNode:
    id: str
    type: str          # "data_element" | "file" | "service" | "regulation"
    label: str
    metadata: dict = field(default_factory=dict)


@dataclass
class KGEdge:
    source: str        # node id
    target: str        # node id
    relation: str      # "collected_in" | "sent_to" | "regulated_by"


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

    for el in scan.data_elements:
        el_id = f"el:{el.name}"
        kg.nodes.append(KGNode(id=el_id, type="data_element", label=el.name, metadata={"flags": el.compliance_flags}))

        for src in el.sources:
            file_id = f"file:{src.file}"
            if file_id not in seen_files:
                kg.nodes.append(KGNode(id=file_id, type="file", label=src.file))
                seen_files.add(file_id)
            kg.edges.append(KGEdge(source=el_id, target=file_id, relation="collected_in"))

        for sink in el.sinks:
            sink_id = f"sink:{sink.type}:{sink.file}"
            kg.nodes.append(KGNode(id=sink_id, type="service", label=sink.type, metadata={"file": sink.file}))
            kg.edges.append(KGEdge(source=el_id, target=sink_id, relation="sent_to"))

        for flag in el.compliance_flags:
            reg_id = f"reg:{flag}"
            if not any(n.id == reg_id for n in kg.nodes):
                kg.nodes.append(KGNode(id=reg_id, type="regulation", label=flag))
            kg.edges.append(KGEdge(source=el_id, target=reg_id, relation="regulated_by"))

    return kg
