"use client";

import { useTransition } from "react";

import { createCourseAction } from "@/lib/course-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type InstructorOption = { id: string; email: string };

export function CourseForm({ instructors }: { instructors: InstructorOption[] }) {
  const [pending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(() => createCourseAction(formData));
  }

  return (
    <form action={handleAction} className="space-y-3 text-sm">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="instructorId">Assign instructor</Label>
        <select
          id="instructorId"
          name="instructorId"
          required
          className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
        >
          <option value="">Select instructor</option>
          {instructors.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.email}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Checkbox id="published" name="published" />
        <Label htmlFor="published" className="text-sm font-normal">
          Mark as published
        </Label>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create course"}
      </Button>
    </form>
  );
}
