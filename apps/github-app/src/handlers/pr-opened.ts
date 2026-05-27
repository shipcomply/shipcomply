import type { Context } from "probot";

const API_URL = process.env.API_URL ?? "https://api.shipcomply.dev";

interface ScanResponse {
  scan_id: string;
  status: string;
}

interface FindingResponse {
  element_type: string;
  severity: string;
  regulation_refs: string[];
  affected_files: string[];
}

interface AuditResponse {
  scan_id: string;
  score: number | null;
  score_label: string;
  findings: FindingResponse[];
  elements_found: number;
}

function severityEmoji(severity: string): string {
  return severity === "HIGH" ? "🔴" : severity === "MEDIUM" ? "🟡" : "🟢";
}

function scoreBar(score: number | null): string {
  if (score === null) return "N/A";
  const filled = Math.round(score / 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${score}/100`;
}

export async function handlePullRequest(context: Context<"pull_request.opened" | "pull_request.synchronize">) {
  const { payload, octokit, log } = context;
  const { repository, pull_request: pr } = payload;

  const check = await octokit.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: "ShipComply Compliance Scan",
    head_sha: pr.head.sha,
    status: "in_progress",
    started_at: new Date().toISOString(),
  });

  try {
    // Pre-warm the API — avoids cold-start timeout on first PR after idle
    await fetch(`${API_URL}/healthz`).catch(() => { /* non-fatal */ });

    const scanRes = await fetch(`${API_URL}/api/v1/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ShipComply-Source": "github-app",
      },
      body: JSON.stringify({
        repo_url: repository.clone_url,
        org_id: repository.owner.login,
        branch: pr.head.ref,
        pr_number: pr.number,
      }),
    });

    if (!scanRes.ok) throw new Error(`Scan API error: ${scanRes.status}`);
    const scan = (await scanRes.json()) as ScanResponse;
    const scanId = scan.scan_id;

    // Fetch audit results (stub endpoint — returns demo data until full persistence is wired)
    let auditBody = "";
    try {
      const auditRes = await fetch(`${API_URL}/api/v1/scans/${scanId}/audit`);
      if (auditRes.ok) {
        const audit = (await auditRes.json()) as AuditResponse;
        const highCount = audit.findings.filter((f) => f.severity === "HIGH").length;
        const conclusion = highCount > 0 ? "action_required" : audit.score !== null && audit.score >= 75 ? "success" : "neutral";

        await octokit.checks.update({
          owner: repository.owner.login,
          repo: repository.name,
          check_run_id: check.data.id,
          status: "completed",
          conclusion,
          completed_at: new Date().toISOString(),
          output: {
            title: `Compliance Score: ${audit.score ?? "N/A"}/100 (${audit.score_label})`,
            summary: `${audit.elements_found} PII element(s) found · ${audit.findings.length} finding(s)`,
          },
        });

        const findingLines = audit.findings.slice(0, 5).map((f) =>
          `| ${severityEmoji(f.severity)} ${f.severity} | \`${f.element_type}\` | ${f.regulation_refs.slice(0, 2).join(", ")} | \`${f.affected_files[0] ?? "—"}\` |`
        );

        auditBody = [
          "",
          "### Compliance Findings",
          "",
          "| Severity | Data Type | Regulations | First Detected In |",
          "|----------|-----------|-------------|-------------------|",
          ...findingLines,
          audit.findings.length > 5 ? `\n*...and ${audit.findings.length - 5} more findings*` : "",
          "",
          `**Score:** \`${scoreBar(audit.score)}\` (${audit.score_label})`,
        ].join("\n");
      }
    } catch (_) {
      // Audit fetch failed — comment still posts with scan ID
    }

    await octokit.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pr.number,
      body: [
        "## ShipComply Compliance Scan",
        "",
        `Scan \`${scanId}\` queued for branch \`${pr.head.ref}\`.`,
        auditBody,
        "",
        `[View full report](https://shipcomply.dev/scans/${scanId})`,
        "",
        "> AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING",
      ].join("\n"),
    });

    log.info({ scan_id: scanId, pr: pr.number }, "Compliance comment posted");
  } catch (error) {
    log.error({ error, pr: pr.number }, "Failed to trigger scan");
    await octokit.checks.update({
      owner: repository.owner.login,
      repo: repository.name,
      check_run_id: check.data.id,
      status: "completed",
      conclusion: "failure",
      completed_at: new Date().toISOString(),
      output: {
        title: "Scan failed",
        summary: "Could not connect to ShipComply API. Please retry or run `npx shipcomply scan` locally.",
      },
    });
  }
}
