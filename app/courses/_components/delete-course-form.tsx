"use client";

import { useState } from "react";
import { deleteCourseAction } from "@/lib/course-actions";
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

type Course = { id: string; title: string };

export function DeleteCourseForm({ courses }: { courses: Course[] }) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <Label htmlFor="delete-course">Course</Label>
        <select
          id="delete-course"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
        >
          <option value="">Select course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={!selectedCourseId}>
            Delete course
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedCourse?.title}</strong> and all its modules, content, assignments, and enrollments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteCourseAction}>
              <input type="hidden" name="courseId" value={selectedCourseId} />
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
