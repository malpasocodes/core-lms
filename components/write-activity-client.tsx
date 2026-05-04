"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  activityId: string;
  courseId: string;
  minChars: number | null;
  maxChars: number | null;
  initialText: string;
  submitAction: (formData: FormData) => Promise<void>;
};

export function WriteActivityClient({
  activityId,
  courseId,
  minChars,
  maxChars,
  initialText,
  submitAction,
}: Props) {
  const [text, setText] = useState(initialText);
  const count = text.length;

  const tooShort = minChars !== null && count < minChars;
  const tooLong = maxChars !== null && count > maxChars;
  const invalid = tooShort || tooLong;

  let hint = "";
  if (tooShort) hint = `${minChars! - count} more character${minChars! - count === 1 ? "" : "s"} needed`;
  else if (tooLong) hint = `${count - maxChars!} character${count - maxChars! === 1 ? "" : "s"} over limit`;
  else if (minChars || maxChars) hint = "Looks good";

  return (
    <form action={submitAction} className="space-y-3">
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="courseId" value={courseId} />
      <Textarea
        name="submissionText"
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your response here…"
        maxLength={maxChars ?? undefined}
        className="resize-y"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            tooLong
              ? "text-red-600"
              : tooShort
              ? "text-amber-600"
              : "text-slate-500"
          }`}
        >
          {count} character{count === 1 ? "" : "s"}
          {hint ? ` · ${hint}` : ""}
        </span>
        <Button
          type="submit"
          disabled={invalid}
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {initialText ? "Update response" : "Submit response"}
        </Button>
      </div>
    </form>
  );
}
