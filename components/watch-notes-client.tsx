"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveWatchNotesAndCompleteAction } from "@/lib/module-actions";

const MIN = 100;
const MAX = 2000;

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      {pending ? "Saving…" : "Save & mark video complete"}
    </Button>
  );
}

type Props = {
  activityId: string;
  initial: string;
  locked: boolean;
};

export function WatchNotesClient({ activityId, initial, locked }: Props) {
  const [notes, setNotes] = useState(initial);
  const len = notes.length;
  const tooShort = len < MIN;
  const tooLong = len > MAX;

  if (locked) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/70 p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Notes</p>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Marked complete
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          As you watch your video, type your notes. Try to use complete sentences.
        </p>
        <p className="whitespace-pre-wrap rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground/90">
          {initial || "(no notes)"}
        </p>
      </div>
    );
  }

  return (
    <form
      action={saveWatchNotesAndCompleteAction}
      className="rounded-lg border border-border/60 bg-card/70 p-4 space-y-3"
    >
      <input type="hidden" name="activityId" value={activityId} />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Notes</p>
        <p className="text-xs text-muted-foreground">
          As you watch your video, type your notes. Try to use complete sentences.
        </p>
      </div>
      <textarea
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        maxLength={MAX}
        placeholder="Start typing your notes here…"
        className="flex w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30 resize-y"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs ${
            tooShort
              ? "text-amber-600 dark:text-amber-400"
              : tooLong
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          }`}
        >
          {len} / {MAX} characters
          {tooShort ? ` — at least ${MIN} required` : ""}
        </p>
        <SaveButton disabled={tooShort || tooLong} />
      </div>
    </form>
  );
}
