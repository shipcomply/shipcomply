"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SAMPLE_NODES = [
  { id: "dpdp", label: "DPDP Act 2023", type: "regulation", x: 400, y: 200 },
  { id: "s4", label: "§4 Consent", type: "section", x: 200, y: 320 },
  { id: "s7", label: "§7 Notice", type: "section", x: 400, y: 320 },
  { id: "s9", label: "§9 Children", type: "section", x: 600, y: 320 },
  { id: "email", label: "email", type: "data_element", x: 100, y: 440 },
  { id: "phone", label: "phone", type: "data_element", x: 250, y: 440 },
  { id: "dob", label: "date_of_birth", type: "data_element", x: 580, y: 440 },
  { id: "consent_basis", label: "Consent", type: "legal_basis", x: 160, y: 560 },
];

const SAMPLE_EDGES = [
  { from: "dpdp", to: "s4" }, { from: "dpdp", to: "s7" }, { from: "dpdp", to: "s9" },
  { from: "s4", to: "email" }, { from: "s7", to: "email" }, { from: "s7", to: "phone" },
  { from: "s9", to: "dob" }, { from: "email", to: "consent_basis" },
];

const TYPE_COLORS: Record<string, string> = {
  regulation: "#63ffb5",
  section: "#4ade80",
  data_element: "#60a5fa",
  legal_basis: "#f59e0b",
  obligation: "#f87171",
};

function KGCanvas({ nodes, edges }: { nodes: typeof SAMPLE_NODES; edges: typeof SAMPLE_EDGES }) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <svg width="100%" viewBox="0 0 700 640" className="w-full" style={{ minHeight: 360 }}>
      {edges.map((e, i) => {
        const from = nodeMap[e.from];
        const to = nodeMap[e.to];
        if (!from || !to) return null;
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#2a2a35" strokeWidth={1.5} />;
      })}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <circle r={28} fill={TYPE_COLORS[n.type] ?? "#888"} fillOpacity={0.15} stroke={TYPE_COLORS[n.type] ?? "#888"} strokeWidth={1.5} />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fill={TYPE_COLORS[n.type] ?? "#ccc"} className="font-mono select-none">
            {n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function KnowledgePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedNode = SAMPLE_NODES.find((n) => n.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Knowledge Graph</h1>
          <p className="text-sm text-bg-7 mt-1">DPDP Act 2023 — obligations, data elements, legal bases.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-bg-7">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {type.replace("_", " ")}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-bg-4 flex items-center justify-between">
                <span className="text-xs text-bg-7 font-mono">DPDP Act 2023 — sample graph (scan to see your data)</span>
                <Badge variant="mint" size="sm">Preview</Badge>
              </div>
              <KGCanvas nodes={SAMPLE_NODES} edges={SAMPLE_EDGES} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Node detail</CardTitle></CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-2">
                  <p className="font-mono text-sm text-bg-11">{selectedNode.label}</p>
                  <Badge variant="default" size="sm">{selectedNode.type}</Badge>
                </div>
              ) : (
                <p className="text-xs text-bg-6">Click a node to see details.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Graph stats</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-bg-7">Nodes</span><span className="font-mono text-bg-10">{SAMPLE_NODES.length}</span></div>
              <div className="flex justify-between"><span className="text-bg-7">Edges</span><span className="font-mono text-bg-10">{SAMPLE_EDGES.length}</span></div>
              <div className="flex justify-between"><span className="text-bg-7">Jurisdiction</span><span className="font-mono text-bg-10">DPDP</span></div>
              <div className="flex justify-between"><span className="text-bg-7">Version</span><span className="font-mono text-bg-10">v1.0</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Full graph coming soon</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-bg-7 leading-relaxed">
                After your first scan, the graph will show which PII fields in your codebase trigger which DPDP obligations — with citation links to specific sections.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
