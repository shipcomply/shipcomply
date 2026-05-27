import type { Context } from "probot";

const API_URL = process.env.API_URL ?? "https://shipcomply-api.onrender.com";

export async function handleInstallation(context: Context<"installation.created">) {
  const { payload, log } = context;
  const account = payload.installation.account.login;
  const installationId = payload.installation.id;

  log.info({ installation_id: installationId, account }, "New installation");

  try {
    await fetch(`${API_URL}/api/v1/integrations/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-ShipComply-Source": "github-app" },
      body: JSON.stringify({ installation_id: installationId, account, action: "created" }),
    });
  } catch (err) {
    log.warn({ err, installation_id: installationId }, "Could not register installation with API — non-fatal");
  }
}
