import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { GITHUB_APP_URL } from "@/lib/constants";

export default function ReposPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Repositories</h1>
          <p className="text-bg-8 text-sm mt-0.5">Connect repos to enable continuous compliance scanning</p>
        </div>
        <a href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer">
          <Button>Connect GitHub</Button>
        </a>
      </div>
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Connected repos</CardTitle>
          <CardDescription>Repositories monitored by ShipComply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-3 flex items-center justify-center">
              <GitBranch size={22} className="text-bg-7" />
            </div>
            <p className="text-bg-8 text-sm max-w-xs">No repos connected. Install the ShipComply GitHub App to enable automatic PR scanning.</p>
            <a href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">Install GitHub App</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
