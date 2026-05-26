import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReposPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Repositories</h1>
          <p className="text-bg-8 text-sm mt-0.5">Connect repos to enable continuous compliance scanning</p>
        </div>
        <Button>Connect GitHub</Button>
      </div>
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Connected repos</CardTitle>
          <CardDescription>Repositories monitored by ShipComply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="text-5xl opacity-20">⊞</div>
            <p className="text-bg-8 text-sm max-w-xs">No repos connected. Install the ShipComply GitHub App to enable automatic PR scanning.</p>
            <Button variant="secondary" size="sm">Install GitHub App</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
