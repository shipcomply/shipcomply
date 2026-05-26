import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ScansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Scans</h1>
          <p className="text-sm text-bg-7 mt-1">History of all compliance scans.</p>
        </div>
        <Link href="/scans/new"><Button>New scan</Button></Link>
      </div>

      <div className="rounded-xl border border-bg-4 divide-y divide-bg-4">
        <div className="flex items-center justify-between px-5 py-3 text-xs font-medium text-bg-6 uppercase tracking-wider">
          <span>Repository</span>
          <div className="flex items-center gap-8">
            <span>Score</span>
            <span>Status</span>
            <span>Started</span>
          </div>
        </div>
        <div className="px-5 py-12 text-center">
          <p className="text-bg-6 text-sm mb-3">No scans yet.</p>
          <Link href="/scans/new">
            <Button variant="secondary" size="sm">Run your first scan</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
