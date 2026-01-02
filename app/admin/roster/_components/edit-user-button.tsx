"use client";

import { useState } from "react";
import { updateUserPasswordAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type EditUserButtonProps = {
  userId: string;
  email: string;
  role: string;
  createdAt: Date;
};

export function EditUserButton({ userId, email, role, createdAt }: EditUserButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            View user details and update password for <strong>{email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize text-foreground">{role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium text-foreground">{createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          <form action={updateUserPasswordAction} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <PasswordInput
              id="newPassword"
              name="newPassword"
              label="New password (min 8 characters)"
              required
              minLength={8}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update password</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
