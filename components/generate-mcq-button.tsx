"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function GenerateMcqButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Generating…" : "Generate Quiz"}
    </Button>
  );
}
