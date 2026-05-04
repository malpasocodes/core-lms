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
    <Button
      type="submit"
      size="sm"
      disabled={disabled || pending}
      className="bg-emerald-600 text-white hover:bg-emerald-700"
    >
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
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Notes</p>
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3,8 7,12 13,4" />
            </svg>
            Marked complete
          </span>
        </div>
        <p className="text-xs text-slate-500">
          As you watch your video, type your notes. Try to use complete sentences.
        </p>
        <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
          {initial || "(no notes)"}
        </p>
      </div>
    );
  }

  return (
    <form
      action={saveWatchNotesAndCompleteAction}
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      <input type="hidden" name="activityId" value={activityId} />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Notes</p>
        <p className="text-xs text-slate-500">
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
        className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus-visible:border-emerald-400 focus-visible:ring-emerald-200 focus-visible:ring-[2px] resize-y"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs ${
            tooShort
              ? "text-amber-600"
              : tooLong
                ? "text-red-600"
                : "text-slate-500"
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
