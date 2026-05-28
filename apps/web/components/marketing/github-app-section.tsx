import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, GitPullRequest, Check, X } from "lucide-react";
import { GITHUB_APP_URL } from "@/lib/constants";

const PR_FINDINGS = [
  { severity: "HIGH",   file: "src/auth/signup.ts",     line: 42, label: "email stored without consent basis" },
  { severity: "MEDIUM", file: "src/analytics/track.ts", line: 18, label: "userId sent to 3rd-party sink" },
  { severity: "LOW",    file: "lib/db/user-model.ts",   line: 91, label: "date_of_birth missing retention policy" },
];

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "text-danger",
  MEDIUM: "text-warning",
  LOW: "text-info",
};

export function GitHubAppSection() {
  return (
    <section className="py-20 px-6 border-t border-bg-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-3xl font-bold text-bg-11">Compliance checks on every PR</h2>
          <Badge variant="default">GitHub App</Badge>
        </div>
        <p className="text-bg-8 mb-10 max-w-xl">
          Install once, get an automatic ShipComply check on every pull request. Block merges when HIGH severity issues surface.
        </p>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <p className="text-bg-8 text-sm leading-relaxed mb-6">
              The GitHub App runs a scan on every PR diff, posts a findings comment with file:line
              citations, and sets a commit status check. Configure severity thresholds to block or
              warn so your team never ships a privacy regression without knowing.
            </p>
            <Link href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Install GitHub App →</Button>
            </Link>
          </div>

          <div className="rounded-xl border border-bg-4 bg-bg-2 overflow-hidden text-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-4 bg-bg-3">
              <GitPullRequest size={14} className="text-bg-8" />
              <span className="text-bg-9 font-medium">ShipComply / compliance-check</span>
              <span className="ml-auto text-xs text-danger font-medium flex items-center gap-1">
                <X size={12} /> 3 findings
              </span>
            </div>
            <div className="divide-y divide-bg-4">
              {PR_FINDINGS.map((f, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 items-start">
                  <AlertTriangle size={13} className={`${SEVERITY_COLOR[f.severity]} flex-shrink-0 mt-0.5`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${SEVERITY_COLOR[f.severity]}`}>{f.severity}</p>
                    <p className="text-xs text-bg-8 mt-0.5">{f.label}</p>
                    <p className="text-xs font-mono text-bg-6 mt-0.5">{f.file}:{f.line}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-bg-4 flex items-center gap-2 text-xs text-bg-7">
              <Check size={12} className="text-success" />
              <span>Merge blocked — resolve HIGH finding first</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
