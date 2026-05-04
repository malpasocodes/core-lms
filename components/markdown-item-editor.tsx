"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { updateReadMarkdownActivityAction } from "@/lib/module-actions";

type Mode = "preview" | "edit";

type Props = {
  itemId: string;
  initialTitle: string;
  initialContent: string;
  redirectTo: string;
};

export function MarkdownItemEditor({ itemId, initialTitle, initialContent, redirectTo }: Props) {
  const [mode, setMode] = useState<Mode>("preview");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
            mode === "preview"
              ? "bg-foreground text-background border-foreground"
              : "border-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
            mode === "edit"
              ? "bg-foreground text-background border-foreground"
              : "border-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          Edit
        </button>
      </div>

      {mode === "preview" && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 md:px-10 md:py-10">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
          </div>
        </div>
      )}

      {mode === "edit" && (
        <form action={updateReadMarkdownActivityAction} className="space-y-3">
          <input type="hidden" name="activityId" value={itemId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Title
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-input/20 px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Markdown content
            </label>
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="flex w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm font-mono transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30 resize-y"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMode("preview")}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
