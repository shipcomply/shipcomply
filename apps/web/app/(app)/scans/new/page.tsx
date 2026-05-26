"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function NewScanPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [jurisdiction, setJurisdiction] = useState("DPDP");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleScan() {
    if (!repoUrl.trim()) { setError("Repo URL required"); return; }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await api.scan.create({ repo_url: repoUrl, jurisdiction }, token ?? "") as { scan_id: string };
      router.push(`/scans/${res.scan_id}`);
    } catch (e: any) {
      setError(e.message ?? "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-bg-11 mb-6">New scan</h1>
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Scan a repository</CardTitle>
          <CardDescription>Paste a public GitHub, GitLab, or Bitbucket URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-bg-9 mb-1.5 block">Repository URL</label>
            <Input
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              error={error}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-bg-9 mb-1.5 block">Jurisdiction</label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-bg-3 border border-bg-5 text-bg-11 text-sm focus:outline-none focus:ring-2 focus:ring-mint-9"
            >
              <option value="DPDP">DPDP Act 2023 (India)</option>
              <option value="GDPR">GDPR (EU)</option>
              <option value="CCPA">CCPA (California)</option>
            </select>
          </div>
          <Button onClick={handleScan} isLoading={loading} className="w-full">
            Start scan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
