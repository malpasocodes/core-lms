"use client";

import { useTransition } from "react";

import { createCourseAction } from "@/lib/course-actions";

export function CourseForm() {
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(() => createCourseAction(formData));
  }

  return (
    <form action={handleAction} className="space-y-3 rounded-lg border border-border/70 bg-card/80 px-4 py-4">
      <div className="space-y-1">
        <label htmlFor="title" className="text-xs font-semibold text-foreground">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-semibold text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <input id="published" name="published" type="checkbox" className="h-4 w-4" />
        <label htmlFor="published" className="text-sm text-foreground">
          Mark as published
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:bg-muted"
      >
        {pending ? "Creating..." : "Create course"}
      </button>
    </form>
  );
}
