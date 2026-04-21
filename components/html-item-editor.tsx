"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateReadHtmlActivityAction } from "@/lib/module-actions";

type Mode = "preview" | "edit";

type Props = {
  itemId: string;
  initialTitle: string;
  initialContent: string;
  redirectTo: string;
};

export function HtmlItemEditor({ itemId, initialTitle, initialContent, redirectTo }: Props) {
  const [mode, setMode] = useState<Mode>("preview");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload() {
    setUploadError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a PNG or JPEG first.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("activityId", itemId);
      form.append("file", file);

      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setUploadError(data.error || "Upload failed.");
        return;
      }

      const snippet = `<img src="${data.url}" alt="" />`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        const next = content.slice(0, start) + snippet + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => {
          ta.focus();
          const cursor = start + snippet.length;
          ta.setSelectionRange(cursor, cursor);
        });
      } else {
        setContent(content + snippet);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
            mode === "preview"
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
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
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Edit
        </button>
      </div>

      {mode === "preview" && (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}

      {mode === "edit" && (
        <>
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Insert image
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="text-sm"
              />
              <Button type="button" size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload image"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              PNG or JPEG, up to 5 MB. The &lt;img&gt; tag is inserted at the cursor.
            </p>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          </div>

          <form action={updateReadHtmlActivityAction} className="space-y-3">
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
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
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                HTML content
              </label>
              <textarea
                ref={textareaRef}
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
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
        </>
      )}
    </div>
  );
}
