"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Pending
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Account pending approval</h1>
          <p className="text-slate-600">
            Your account has been created and is awaiting administrator approval.
            You&apos;ll be notified when it&apos;s approved.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            If you believe this is an error or need immediate access, please contact your administrator.
          </p>
        </div>

        <SignOutButton>
          <Button variant="outline">Sign out</Button>
        </SignOutButton>
      </div>
    </div>
  );
}
