"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bg-11">Settings</h1>
        <p className="text-sm text-bg-7 mt-1">Manage your account and organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
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
            <p className="text-xs text-bg-6 mt-1">Managed by Clerk — change in account settings.</p>
          </div>
          <Button onClick={() => setSaved(true)} variant={saved ? "secondary" : "primary"}>
            {saved ? "Saved" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Settings shared across your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bg-9 mb-1.5">Organization name</label>
            <Input placeholder="Acme Corp" defaultValue="" />
          </div>
          <div>
            <label className="block text-sm font-medium text-bg-9 mb-1.5">Default jurisdiction</label>
            <select className="w-full rounded-lg bg-bg-2 border border-bg-5 text-bg-10 px-3 py-2 text-sm focus:outline-none focus:border-mint-9">
              <option value="DPDP">DPDP (India)</option>
              <option value="GDPR">GDPR (EU)</option>
              <option value="CCPA">CCPA (California)</option>
            </select>
          </div>
          <Button>Save organization settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Use these to integrate ShipComply with your CI/CD pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-3 border-b border-bg-4 last:border-0">
            <div>
              <p className="text-sm font-medium text-bg-10">No API keys yet</p>
              <p className="text-xs text-bg-7">Keys can be used to trigger scans from CI.</p>
            </div>
            <Button variant="secondary" size="sm">Generate key</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-bg-10">Export my data</p>
              <p className="text-xs text-bg-7">Download all your scans and audit reports.</p>
            </div>
            <Button variant="secondary" size="sm">Export</Button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-bg-4">
            <div>
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="text-xs text-bg-7">Permanently delete all data. This cannot be undone.</p>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
