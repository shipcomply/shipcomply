import { notFound } from "next/navigation";

interface ScanPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen p-8" style={{ background: "#0a0a0f" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            &larr; Back to dashboard
          </a>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Scan Result</h1>
          <p className="text-gray-400 text-sm font-mono">ID: {id}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/10 p-6 text-center" style={{ background: "#15151c" }}>
            <div className="text-5xl font-bold" style={{ color: "#63ffb5" }}>--</div>
            <div className="text-sm text-gray-400 mt-2">Compliance Score</div>
            <div className="text-xs text-gray-600 mt-1">Loading...</div>
          </div>
          <div className="lg:col-span-2 rounded-xl border border-white/10 p-6" style={{ background: "#15151c" }}>
            <h2 className="text-lg font-semibold text-white mb-4">Data Elements</h2>
            <div className="text-center py-8 text-gray-500"><p>Scan in progress...</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 p-6" style={{ background: "#15151c" }}>
          <h2 className="text-lg font-semibold text-white mb-4">Compliance Findings</h2>
          <div className="text-center py-8 text-gray-500"><p>No findings yet.</p></div>
        </div>
        <p className="text-xs text-gray-600">AI-GENERATED DRAFT - REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING</p>
      </div>
    </div>
  );
}
