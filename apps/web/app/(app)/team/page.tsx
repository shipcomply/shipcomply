"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

function handleInvite() {
  toast.info("Team invites coming soon — email support@shipcomply.dev for early access");
}

export default function TeamPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bg-11">Team</h1>
          <p className="text-bg-8 text-sm mt-0.5">Manage members and permissions</p>
        </div>
        <Button onClick={handleInvite}>Invite member</Button>
      </div>
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People who have access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-3 flex items-center justify-center">
              <Users size={22} className="text-bg-7" />
            </div>
            <p className="text-bg-8 text-sm max-w-xs">Invite team members to collaborate on compliance reviews.</p>
            <Button variant="secondary" size="sm" onClick={handleInvite}>Send invites</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
