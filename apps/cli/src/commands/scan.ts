import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { ScanUI } from "./scan-ui.js";

export const scanCommand = new Command("scan")
  .description("Scan a repo for DPDP/GDPR compliance")
  .argument("<target>", "Local path or GitHub URL to scan")
  .option("--offline", "Use local Ollama only, no network calls")
  .option("--api-url <url>", "ShipComply API URL", process.env.API_URL ?? "http://localhost:8000")
  .option("--branch <branch>", "Git branch to scan", "main")
  .action(async (target: string, options: { offline: boolean; apiUrl: string; branch: string }) => {
    const { unmount } = render(
      React.createElement(ScanUI, {
        target,
        offline: options.offline || process.env.OFFLINE === "true",
        apiUrl: options.apiUrl,
        branch: options.branch,
      })
    );
    process.on("exit", () => unmount());
  });
