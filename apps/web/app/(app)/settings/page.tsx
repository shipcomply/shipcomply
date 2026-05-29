"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { GITHUB_APP_URL } from "@/lib/constants";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://shipcomply-api.onrender.com";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} className="p-1.5 rounded text-bg-7 hover:text-bg-11 hover:bg-bg-3 transition-colors" aria-label="Copy">
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative group">
      <pre className="text-xs font-mono bg-bg-2 border border-bg-5 rounded-lg p-4 overflow-x-auto text-bg-9 leading-relaxed whitespace-pre">
        {children}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const mcpConfig = JSON.stringify({
    mcpServers: {
      shipcomply: {
        command: "npx",
        args: ["-y", "shipcomply-mcp-server"],
        env: {
          SHIPCOMPLY_API_KEY: "<your-api-key-from-above>",
        },
      },
    },
  }, null, 2);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg-11">Settings</h1>
        <p className="text-sm text-bg-7 mt-1">Manage your account and integrations.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Profile</CardTitle>
            <Badge variant="default" className="text-xs">Personal</Badge>
          </div>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bg-9 mb-1.5">Display name</label>
            <Input placeholder="Your name" defaultValue="" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bg-9 mb-1.5">Email</label>
            <Input placeholder="you@example.com" disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-bg-6 mt-1">Managed by Clerk. Change in account settings.</p>
          </div>
          <Button onClick={() => { setSaved(true); toast.success("Saved"); }} variant={saved ? "secondary" : "primary"}>
            {saved ? "Saved" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Organization</CardTitle>
            <Badge variant="default" className="text-xs">Team-wide</Badge>
          </div>
          <CardDescription>Settings shared across your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bg-9 mb-1.5">Default jurisdiction</label>
            <select className="w-full rounded-lg bg-bg-2 border border-bg-5 text-bg-10 px-3 py-2 text-sm focus:outline-none focus:border-mint-9">
              <option value="DPDP">DPDP (India)</option>
              <option value="GDPR">GDPR (EU)</option>
              <option value="CCPA">CCPA (California)</option>
            </select>
          </div>
          <Button onClick={() => toast.success("Saved")}>Save organization settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>API Keys</CardTitle>
            <Badge variant="default" className="text-xs">Personal</Badge>
          </div>
          <CardDescription>Use these to trigger scans from CI, MCP, or the CLI. Only visible to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-bg-10">No API keys yet</p>
              <p className="text-xs text-bg-7">Keys grant access to POST /api/v1/scans on your behalf.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast.info("API key generation coming soon")}>
              Generate key
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Developers</CardTitle>
            <Badge variant="default" className="text-xs">Public</Badge>
          </div>
          <CardDescription>Integrate ShipComply with your tools. Same config for all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium text-bg-9 mb-1.5">API base URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-bg-2 border border-bg-5 rounded px-3 py-1.5 text-bg-9 flex-1 truncate">
                {API_BASE}
              </code>
              <CopyButton text={API_BASE} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-bg-9 mb-1">Claude Desktop / Cursor MCP config</p>
            <p className="text-xs text-bg-7 mb-2">
              Add to <code className="font-mono">~/.config/claude/mcp.json</code> or your editor&apos;s MCP settings.
              Replace <code className="font-mono">&lt;your-api-key&gt;</code> once you generate a key above.
            </p>
            <CodeBlock>{mcpConfig}</CodeBlock>
            <p className="text-xs text-bg-6 mt-2">
              Then ask Claude: &ldquo;use shipcomply to scan github.com/vercel/next.js&rdquo;
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-bg-9 mb-1">GitHub App</p>
            <p className="text-xs text-bg-7 mb-3">
              Install on any repo to get automatic compliance checks on every PR.
            </p>
            <a href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">Install GitHub App →</Button>
            </a>
          </div>

          <div>
            <p className="text-sm font-medium text-bg-9 mb-1">Documentation</p>
            <a href="https://docs.shipcomply.dev" target="_blank" rel="noopener noreferrer"
              className="text-sm text-mint-9 hover:text-mint-11 transition-colors">
              docs.shipcomply.dev →
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-danger">Danger zone</CardTitle>
            <Badge variant="danger" className="text-xs">Personal</Badge>
          </div>
          <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-bg-10">Export my data</p>
              <p className="text-xs text-bg-7">Download all your scans and audit reports.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast.info("Export coming soon")}>Export</Button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-bg-4">
            <div>
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="text-xs text-bg-7">Permanently delete all data. This cannot be undone.</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => toast.error("Contact support to delete your account")}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
