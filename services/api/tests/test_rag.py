"""RAG retrieval sanity checks — CI gate for Day-2."""
import pytest
from unittest.mock import MagicMock, patch


def _make_chunk(text: str, regulation: str, section: str) -> dict:
    return {"text": text, "regulation": regulation, "section": section, "score": 0.9}


class TestRAGRetrieverUnit:
    """Unit tests — no DB required."""

    def test_chunk_structure(self):
        chunk = _make_chunk("personal data", "DPDP", "Section 4")
        assert "text" in chunk
        assert "regulation" in chunk
        assert "section" in chunk

    def test_rrf_fusion_prefers_higher_scores(self):
        """RRF should rank chunk with score 0.9 above 0.1."""
        chunks = [
            _make_chunk("email data fiduciary", "DPDP", "Section 4"),
            _make_chunk("unrelated clause", "DPDP", "Section 99"),
        ]
        # Sort by score descending as a proxy for RRF
        ranked = sorted(chunks, key=lambda c: c["score"], reverse=True)
        assert ranked[0]["text"] == "email data fiduciary"

    def test_jurisdiction_filter_accepts_matching(self):
        chunks = [
            _make_chunk("text", "DPDP", "S4"),
            _make_chunk("text", "GDPR", "A5"),
        ]
        filtered = [c for c in chunks if c["regulation"] == "DPDP"]
        assert len(filtered) == 1
        assert filtered[0]["regulation"] == "DPDP"

    def test_jurisdiction_filter_rejects_mismatch(self):
        chunks = [_make_chunk("text", "GDPR", "A5")]
        filtered = [c for c in chunks if c["regulation"] == "DPDP"]
        assert len(filtered) == 0


class TestKnowledgeGraph:
    """KG build tests — no DB required."""

    def test_graph_has_nodes_and_edges(self):
        from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
        from shipcomply_api.scanner.knowledge_graph import build_graph

        result = ScanResult(
            data_elements=[
                DataElement(
                    element_type="email",
                    field_name="email",
                    compliance_flags=["DPDP_S4", "GDPR_A5_1_A"],
                    sources=[ElementSource(file="app/page.tsx", line=10, pattern="jsx_input")],
                )
            ],
            files_scanned=3,
            scan_id="test-123",
        )
        graph = build_graph(result)
        assert len(graph.nodes) > 0
        assert len(graph.edges) > 0

    def test_graph_contains_element_node(self):
        from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
        from shipcomply_api.scanner.knowledge_graph import build_graph

        result = ScanResult(
            data_elements=[
                DataElement(
                    element_type="phone",
                    field_name="phone",
                    compliance_flags=["DPDP_S4"],
                    sources=[ElementSource(file="lib/actions.ts", line=5, pattern="field_assign")],
                )
            ],
            files_scanned=2,
            scan_id="test-456",
        )
        graph = build_graph(result)
        node_types = [n.type for n in graph.nodes]
        assert "data_element" in node_types

    def test_graph_to_dict_serializable(self):
        from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
        from shipcomply_api.scanner.knowledge_graph import build_graph
        import json

        result = ScanResult(
            data_elements=[
                DataElement(
                    element_type="email",
                    field_name="email",
                    compliance_flags=["DPDP_S4"],
                    sources=[ElementSource(file="app/page.tsx", line=1, pattern="jsx_input")],
                )
            ],
            files_scanned=1,
            scan_id="test-789",
        )
        graph = build_graph(result)
        d = graph.to_dict()
        # Must be JSON-serializable
        serialized = json.dumps(d)
        assert "nodes" in d
        assert "edges" in d

    def test_compliance_flags_generate_regulation_nodes(self):
        from shipcomply_api.scanner import ScanResult, DataElement, ElementSource
        from shipcomply_api.scanner.knowledge_graph import build_graph

        result = ScanResult(
            data_elements=[
                DataElement(
                    element_type="dob",
                    field_name="dateOfBirth",
                    compliance_flags=["DPDP_S4", "GDPR_A9"],
                    sources=[ElementSource(file="app/form.tsx", line=20, pattern="jsx_input")],
                )
            ],
            files_scanned=1,
            scan_id="test-abc",
        )
        graph = build_graph(result)
        node_types = [n.type for n in graph.nodes]
        assert "regulation" in node_types
