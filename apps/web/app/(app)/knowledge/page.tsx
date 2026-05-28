"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_NODES = [
  { id: "dpdp", label: "DPDP Act 2023", type: "regulation", x: 400, y: 80 },
  { id: "s4",   label: "§4 Notice",      type: "section",    x: 180, y: 220 },
  { id: "s6",   label: "§6 Consent",     type: "section",    x: 400, y: 220 },
  { id: "s7",   label: "§7 Purpose",     type: "section",    x: 620, y: 220 },
  { id: "s8",   label: "§8 Children",    type: "section",    x: 800, y: 220 },
  { id: "email",   label: "email",    type: "data_element", x: 100, y: 380 },
  { id: "phone",   label: "phone",    type: "data_element", x: 260, y: 380 },
  { id: "dob",     label: "date_of_birth", type: "data_element", x: 420, y: 380 },
  { id: "biometric", label: "biometric", type: "data_element", x: 600, y: 380 },
  { id: "consent", label: "Consent Basis", type: "legal_basis", x: 400, y: 520 },
];

const SAMPLE_EDGES = [
  ["dpdp","s4"],["dpdp","s6"],["dpdp","s7"],["dpdp","s8"],
  ["s4","email"],["s4","phone"],["s6","email"],["s6","phone"],
  ["s6","dob"],["s8","biometric"],["s7","consent"],["s6","consent"],
];

const TYPE_COLOR: Record<string,string> = {
  regulation: "#63ffb5",
  section: "#818cf8",
  data_element: "#f59e0b",
  legal_basis: "#22d3ee",
};

const TYPE_LABEL: Record<string,string> = {
  regulation: "Regulation",
  section: "Section",
  data_element: "Data Element",
  legal_basis: "Legal Basis",
};

interface KGNode { id: string; label: string; type: string; x: number; y: number; }

export default function KnowledgePage() {
  const [selected, setSelected] = useState<KGNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgW = 900, svgH = 600;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-bg-11">Legal Map</h1>
        <p className="text-sm text-bg-7 mt-0.5">DPDP Act 2023 — obligations, data elements, legal bases</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why this matters</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-bg-8 space-y-2 leading-relaxed">
          <p>This is the legal corpus the scanner cross-references when generating your policy. Every citation in your audit PDF traces back to one of these section nodes.</p>
          <p>Click any node to see the obligation, the data elements that trigger it, and the legal basis that justifies processing. After completing a scan, the graph highlights which nodes your codebase activates.</p>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(TYPE_LABEL).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-bg-7">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[type] }} />
            {label}
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-xl border border-bg-4 bg-bg-1 overflow-hidden"
      >
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block"
          role="application"
          aria-label="DPDP Act 2023 knowledge graph — clickable nodes for regulation sections, data elements, and legal bases"
        >
          <title>DPDP Act 2023 Knowledge Graph</title>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#3c3c4e" />
            </marker>
          </defs>

          {/* Edges */}
          {SAMPLE_EDGES.map(([from, to]) => {
            const a = SAMPLE_NODES.find(n => n.id === from)!;
            const b = SAMPLE_NODES.find(n => n.id === to)!;
            return (
              <line key={`${from}-${to}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#2c2c3a" strokeWidth="1.5" markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Nodes */}
          {SAMPLE_NODES.map((node, i) => {
            const color = TYPE_COLOR[node.type] ?? "#63ffb5";
            const isSelected = selected?.id === node.id;
            const isHovered = hovered === node.id;
            return (
              <motion.g key={node.id} style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={node.label}
                aria-pressed={isSelected}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.25, type: "spring", stiffness: 260, damping: 20 }}
                onClick={() => setSelected(isSelected ? null : node)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(isSelected ? null : node); } }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle cx={node.x} cy={node.y} r={isSelected || isHovered ? 18 : 14}
                  fill={`${color}22`} stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  style={{ transition: "r 150ms, stroke-width 150ms" }}
                />
                <text x={node.x} y={node.y + 30} textAnchor="middle"
                  fontSize="10" fill="#8b8ba7" className="select-none pointer-events-none">
                  {node.label}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </motion.div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: TYPE_COLOR[selected.type] }} />
                {selected.label}
                <Badge variant="default" className="ml-1 text-xs">{TYPE_LABEL[selected.type]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-bg-7 space-y-2">
              <p>Node ID: <span className="font-mono text-bg-9">{selected.id}</span></p>
              <p>Type: <span className="text-bg-9">{selected.type}</span></p>
              {selected.type === "section" && (
                <p className="text-bg-8">Clicking a section shows its obligations and linked data elements. Full corpus view available after completing a scan.</p>
              )}
              {selected.type === "data_element" && (
                <p className="text-bg-8">This data element triggers compliance obligations in sections linked above. Run a scan to see which files in your repo handle this element.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <p className="text-xs text-bg-7 text-center">
        AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING
      </p>
    </div>
  );
}
