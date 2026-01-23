"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Account Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account has been created and is awaiting administrator approval.
            You will be notified when your account has been approved.
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card/80 p-6">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error or need immediate access, please contact your administrator.
          </p>
        </div>

        <SignOutButton>
          <Button variant="outline">Sign Out</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
