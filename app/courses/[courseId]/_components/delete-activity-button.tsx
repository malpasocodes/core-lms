"use client";

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
import { deleteActivityAction } from "@/lib/module-actions";

type Props = {
  activityId: string;
  activityTitle: string;
  activityType: string;
};

export function DeleteActivityButton({ activityId, activityTitle, activityType }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete activity?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {activityType} activity{" "}
            <strong>{activityTitle}</strong> and any attached assessments and submissions. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteActivityAction}>
            <input type="hidden" name="activityId" value={activityId} />
            <AlertDialogAction type="submit" variant="destructive">
              Delete
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
