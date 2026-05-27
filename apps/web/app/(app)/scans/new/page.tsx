"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, ProvisioningError } from "@/lib/api";

const PRESETS = [
  { label: "vercel/next.js",    url: "https://github.com/vercel/next.js" },
  { label: "supabase/supabase", url: "https://github.com/supabase/supabase" },
  { label: "calcom/cal.com",    url: "https://github.com/calcom/cal.com" },
];

const JURISDICTIONS = [
  { value: "DPDP", label: "DPDP Act 2023",   desc: "India — applies to any org processing Indian users' data" },
  { value: "GDPR", label: "GDPR",            desc: "EU/EEA — extraterritorial; applies if serving EU residents" },
  { value: "CCPA", label: "CCPA / CPRA",     desc: "California — applies to businesses meeting revenue/data thresholds" },
];

const REPO_RE = /^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[\w.\-]+\/[\w.\-]+(\.git)?$/;

async function createWithRetry(
  body: unknown,
  token: string,
  maxRetries = 3,
): Promise<{ scan_id: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await api.scan.create(body, token) as { scan_id: string };
    } catch (err) {
      if (err instanceof ProvisioningError && attempt < maxRetries) {
        toast.loading(`Setting up your account… (${attempt + 1}/${maxRetries})`, { id: "provisioning" });
        await new Promise((r) => setTimeout(r, (err.retryAfter ?? 3) * 1000));
      } else {
        toast.dismiss("provisioning");
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

function NewScanForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [repoUrl, setRepoUrl] = useState(searchParams.get("repo") ?? "");
  const [jurisdiction, setJurisdiction] = useState("DPDP");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const preset = searchParams.get("repo");
    if (preset) setRepoUrl(preset);
  }, [searchParams]);

  function validateUrl(v: string): boolean {
    if (!v.trim()) { setUrlError("Repo URL required"); return false; }
    if (!REPO_RE.test(v.trim().replace(/\/$/, ""))) {
      setUrlError("Must be a public GitHub, GitLab, or Bitbucket HTTPS URL");
      return false;
    }
    setUrlError("");
    return true;
  }

  async function handleScan() {
    if (!validateUrl(repoUrl)) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await createWithRetry({ repo_url: repoUrl.trim(), jurisdiction }, token ?? "");
      toast.dismiss("provisioning");
      toast.success("Scan queued — analyzing your repository");
      router.push(`/scans/${res.scan_id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      toast.error(msg);
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
        <CardContent className="space-y-5">
          {/* Quick presets */}
          <div>
            <p className="text-xs text-bg-7 mb-2 font-medium uppercase tracking-wide">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => { setRepoUrl(p.url); setUrlError(""); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-bg-3 border border-bg-5 text-bg-9 hover:bg-bg-4 hover:text-bg-11 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          <div>
            <label htmlFor="repo-url" className="text-sm font-medium text-bg-9 mb-1.5 block">
              Repository URL
            </label>
            <Input
              id="repo-url"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); if (urlError) validateUrl(e.target.value); }}
              onBlur={() => repoUrl && validateUrl(repoUrl)}
              error={urlError}
            />
          </div>

          {/* Jurisdiction */}
          <div>
            <p className="text-sm font-medium text-bg-9 mb-2">Jurisdiction</p>
            <div className="space-y-2" role="radiogroup" aria-label="Jurisdiction">
              {JURISDICTIONS.map((j) => (
                <label
                  key={j.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    jurisdiction === j.value
                      ? "border-mint-9 bg-mint-9/8"
                      : "border-bg-5 bg-bg-2 hover:bg-bg-3"
                  }`}
                >
                  <input
                    type="radio"
                    name="jurisdiction"
                    value={j.value}
                    checked={jurisdiction === j.value}
                    onChange={() => setJurisdiction(j.value)}
                    className="mt-0.5 accent-mint-9"
                  />
                  <div>
                    <p className="text-sm font-medium text-bg-11">{j.label}</p>
                    <p className="text-xs text-bg-7 mt-0.5">{j.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleScan}
            isLoading={loading}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Starting scan…" : "Start scan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewScanPage() {
  return (
    <Suspense fallback={<div className="max-w-xl"><div className="h-96 rounded-xl bg-bg-2 animate-pulse" /></div>}>
      <NewScanForm />
    </Suspense>
  );
}
