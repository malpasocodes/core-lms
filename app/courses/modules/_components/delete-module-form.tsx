"use client";

import { useState } from "react";
import { deleteModuleAction } from "@/lib/module-actions";
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

type Module = { id: string; title: string; courseTitle: string | null };

export function DeleteModuleForm({ modules }: { modules: Module[] }) {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <Label htmlFor="delete-module">Module</Label>
        <select
          id="delete-module"
          value={selectedModuleId}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
        >
          <option value="">Select module</option>
          {modules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {mod.title} ({mod.courseTitle})
            </option>
          ))}
        </select>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={!selectedModuleId}>
            Delete module
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedModule?.title}</strong> and all its content items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteModuleAction}>
              <input type="hidden" name="moduleId" value={selectedModuleId} />
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
