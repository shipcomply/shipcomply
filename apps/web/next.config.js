const fs = require("fs");
const path = require("path");

// Monorepo: the shared .env lives at the repo root, but `next build`/`next dev`
// only auto-load env files from this app dir. Without this, NEXT_PUBLIC_* keys
// (Clerk publishable key, app URL) are undefined at build time and <ClerkProvider>
// throws "Missing publishableKey" while prerendering /_not-found, failing the build.
// On Vercel the values come from the dashboard environment, so the `=== undefined`
// guard leaves those untouched there.
const rootEnv = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnv)) {
  for (const line of fs.readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
};

module.exports = nextConfig;
