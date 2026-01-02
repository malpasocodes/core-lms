"use client";

import { useState } from "react";
import { deleteContentItemAction } from "@/lib/module-actions";
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

type ContentItem = {
  id: string;
  title: string;
  courseTitle: string | null;
  moduleTitle: string | null;
};

export function DeleteContentForm({ items }: { items: ContentItem[] }) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <Label htmlFor="delete-item">Content item</Label>
        <select
          id="delete-item"
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
        >
          <option value="">Select content</option>
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
            Delete content
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedItem?.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteContentItemAction}>
              <input type="hidden" name="itemId" value={selectedItemId} />
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
