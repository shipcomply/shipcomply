import type { Context } from "probot";

export async function handleInstallation(context: Context<"installation.created">) {
  const { payload, log } = context;
  log.info(
    { installation_id: payload.installation.id, account: payload.installation.account.login },
    "New installation"
  );
  // TODO: create org record in Supabase, send welcome email
}
