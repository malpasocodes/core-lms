"use client";

import { useState } from "react";
import { deleteActivityAction } from "@/lib/module-actions";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ActivityItem = {
  id: string;
  title: string;
  courseTitle: string | null;
  moduleTitle: string | null;
};

export function DeleteContentForm({ items }: { items: ActivityItem[] }) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <Label htmlFor="delete-item">Activity</Label>
        <select
          id="delete-item"
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
        >
          <option value="">Select activity</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} ({item.courseTitle} / {item.moduleTitle})
            </option>
          ))}
        </select>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={!selectedItemId}>
            Delete activity
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedItem?.title}</strong> and any attached assessments and submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteActivityAction}>
              <input type="hidden" name="activityId" value={selectedItemId} />
              <AlertDialogAction type="submit" variant="destructive">
                Delete
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
