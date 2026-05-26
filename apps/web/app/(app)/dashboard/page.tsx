import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { userId } = await auth();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Dashboard</h1>
          <p className="text-bg-8 text-sm mt-0.5">Overview of your compliance scans</p>
        </div>
        <Link href="/scans/new">
          <Button>New scan</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total scans", value: "0", sub: "this month" },
          { label: "Avg score", value: "—", sub: "compliance" },
          { label: "Data elements found", value: "0", sub: "across all scans" },
        ].map((s) => (
          <Card key={s.label} variant="bordered">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-bg-11 mb-1">{s.value}</div>
              <div className="text-sm font-medium text-bg-9">{s.label}</div>
              <div className="text-xs text-bg-7 mt-0.5">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent scans */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
          <CardDescription>Your latest compliance scans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="text-5xl opacity-20">◎</div>
            <p className="text-bg-8 text-sm max-w-xs">No scans yet. Connect a GitHub repository and run your first compliance scan.</p>
            <div className="flex gap-3">
              <Link href="/repos">
                <Button variant="secondary" size="sm">Connect a repo</Button>
              </Link>
              <Link href="/scans/new">
                <Button size="sm">Scan a URL</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
