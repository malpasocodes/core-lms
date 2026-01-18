"use client";

import { useState } from "react";
import { updateUserRoleAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
            View user details and update role for <strong>{email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Role</span>
              <span className="font-medium capitalize text-foreground">{role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium text-foreground">{createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          <form action={updateUserRoleAction} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <div className="space-y-1">
              <Label htmlFor="role">New Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={role}
                className="flex h-9 w-full rounded-md border border-input bg-input/20 px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Password management is handled through Clerk. Users can reset their own passwords.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update role</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
