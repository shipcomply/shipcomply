"""KG builder — constructs scan-level knowledge graph linking DataElements to DPDP sections."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from shipcomply_api.kg.retriever import KGRetriever


@dataclass
class KGGraph:
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"nodes": self.nodes, "edges": self.edges}


class KGBuilder:
    def __init__(self, retriever: KGRetriever | None = None) -> None:
        self._retriever = retriever or KGRetriever()

    def build(self, data_elements: list[Any]) -> KGGraph:
        graph = KGGraph()
        seen_sections: set[str] = set()

        for el in data_elements:
            el_node_id = str(uuid.uuid4())
            graph.nodes.append({
                "id": el_node_id,
                "type": "data_element",
                "label": el.field_name,
                "element_type": el.element_type,
            })

            sections = self._retriever.get_relevant_sections([el.element_type])
            for sec in sections:
                sec_id = sec["identifier"]
                if sec_id not in seen_sections:
                    graph.nodes.append({
                        "id": sec_id,
                        "type": "section",
                        "label": sec["title"],
                        "body": sec.get("body", ""),
                    })
                    seen_sections.add(sec_id)
                graph.edges.append({"from": el_node_id, "to": sec_id, "relation": "triggers"})

        return graph
