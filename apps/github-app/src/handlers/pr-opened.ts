import type { Context } from "probot";

const API_URL = process.env.API_URL ?? "https://api.shipcomply.dev";

export async function handlePullRequest(context: Context<"pull_request.opened">) {
  const { payload, octokit, log } = context;
  const { repository, pull_request: pr } = payload;

  // Create pending check
  await octokit.checks.create({
    owner: repository.owner.login,
    repo: repository.name,
    name: "ShipComply Compliance Scan",
    head_sha: pr.head.sha,
    status: "in_progress",
    started_at: new Date().toISOString(),
  });

  try {
    const response = await fetch(`${API_URL}/api/v1/scans`, {
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

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const scan = await response.json();

    await octokit.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pr.number,
      body: [
        "## ShipComply Compliance Scan",
        "",
        `Scan initiated. Results will appear shortly.`,
        `Scan ID: \`${scan.scan_id}\``,
        "",
        "> AI-GENERATED DRAFT — REVIEW BY QUALIFIED ATTORNEY BEFORE PUBLISHING",
      ].join("\n"),
    });

    log.info({ scan_id: scan.scan_id, pr: pr.number }, "Scan queued for PR");
  } catch (error) {
    log.error({ error, pr: pr.number }, "Failed to trigger scan");

    await octokit.checks.create({
      owner: repository.owner.login,
      repo: repository.name,
      name: "ShipComply Compliance Scan",
      head_sha: pr.head.sha,
      status: "completed",
      conclusion: "failure",
      completed_at: new Date().toISOString(),
      output: {
        title: "Scan failed",
        summary: "Could not connect to ShipComply API. Please retry.",
      },
    });
  }
}
