export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: "#0a0a0f" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <a
            href="/scans/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black"
            style={{ background: "#63ffb5" }}
          >
            New Scan
          </a>
        </div>
        <div className="rounded-xl border border-white/10 p-8 text-center text-gray-400" style={{ background: "#15151c" }}>
          <p className="text-lg">No scans yet.</p>
          <p className="text-sm mt-2">Connect a repo to get started.</p>
        </div>
      </div>
    </div>
  );
}
