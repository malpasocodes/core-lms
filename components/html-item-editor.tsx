"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateReadHtmlActivityAction } from "@/lib/module-actions";

type Mode = "preview" | "edit";

type Props = {
  itemId: string;
  initialTitle: string;
  initialContent: string;
  redirectTo: string;
};

type ImageRef = {
  key: string;
  index: number;
  src: string;
  alt: string;
  tag: string;
  tagStart: number;
  tagEnd: number;
  figureStart: number | null;
  figureEnd: number | null;
};

function findImages(content: string): ImageRef[] {
  const refs: ImageRef[] = [];
  const imgRegex = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let i = 1;
  while ((m = imgRegex.exec(content)) !== null) {
    const tag = m[0];
    const tagStart = m.index;
    const tagEnd = tagStart + tag.length;
    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);

    let figureStart: number | null = null;
    let figureEnd: number | null = null;
    const figOpenRegex = /<figure\b[^>]*>/gi;
    let lastOpen: { start: number; end: number } | null = null;
    let f: RegExpExecArray | null;
    while ((f = figOpenRegex.exec(content)) !== null) {
      if (f.index >= tagStart) break;
      lastOpen = { start: f.index, end: f.index + f[0].length };
    }
    if (lastOpen) {
      const between = content.slice(lastOpen.end, tagStart);
      if (!/<\/figure\s*>/i.test(between)) {
        const after = content.slice(tagEnd);
        const close = after.match(/<\/figure\s*>/i);
        if (close && close.index !== undefined) {
          figureStart = lastOpen.start;
          figureEnd = tagEnd + close.index + close[0].length;
        }
      }
    }

    refs.push({
      key: `${tagStart}-${i}`,
      index: i,
      src: srcMatch?.[1] ?? "",
      alt: altMatch?.[1] ?? "",
      tag,
      tagStart,
      tagEnd,
      figureStart,
      figureEnd,
    });
    i++;
  }
  return refs;
}

export function HtmlItemEditor({ itemId, initialTitle, initialContent, redirectTo }: Props) {
  const [mode, setMode] = useState<Mode>("preview");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const images = useMemo(() => findImages(content), [content]);

  async function uploadFile(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("activityId", itemId);
    form.append("file", file);
    const res = await fetch("/api/upload-image", { method: "POST", body: form });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      setUploadError(data.error || "Upload failed.");
      return null;
    }
    return data.url;
  }

  async function handleUpload() {
    setUploadError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a PNG or JPEG first.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (!url) return;

      const snippet = `<img src="${url}" alt="" />`;
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

  function locate(ref: ImageRef) {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ref.tagStart, ref.tagEnd);
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 16;
    const linesBefore = content.slice(0, ref.tagStart).split("\n").length;
    ta.scrollTop = Math.max(0, (linesBefore - 5) * lineHeight);
  }

  function removeImage(ref: ImageRef) {
    const start = ref.figureStart ?? ref.tagStart;
    const end = ref.figureEnd ?? ref.tagEnd;
    setContent(content.slice(0, start) + content.slice(end));
  }

  function triggerReplace(key: string) {
    setReplacingKey(key);
    setUploadError(null);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
      replaceInputRef.current.click();
    }
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const key = replacingKey;
    setReplacingKey(null);
    if (!file || !key) return;

    const ref = images.find((r) => r.key === key);
    if (!ref) return;

    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (!url) return;
      const newTag = ref.tag.replace(/\bsrc\s*=\s*["'][^"']*["']/i, `src="${url}"`);
      setContent(content.slice(0, ref.tagStart) + newTag + content.slice(ref.tagEnd));
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
            className="prose prose-neutral dark:prose-invert max-w-none [&_img]:outline [&_img]:outline-2 [&_img]:outline-dashed [&_img]:outline-amber-500 [&_img]:outline-offset-2"
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

          {images.length > 0 && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Images in content ({images.length})
              </p>
              <ul className="space-y-2">
                {images.map((ref) => (
                  <li
                    key={ref.key}
                    className="flex items-center gap-3 rounded border border-border/60 bg-card/70 p-2"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border/60 bg-muted/40">
                      {ref.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ref.src}
                          alt={ref.alt}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">?</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        Image {ref.index}
                        {ref.figureStart !== null && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            in figure
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={ref.src}>
                        {ref.src || "(no src)"}
                      </p>
                      {ref.alt && (
                        <p className="truncate text-[11px] italic text-muted-foreground">
                          alt: {ref.alt}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => locate(ref)}>
                        Locate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => triggerReplace(ref.key)}
                        disabled={uploading}
                      >
                        Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(ref)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleReplaceFile}
              />
            </div>
          )}

          <form action={updateReadHtmlActivityAction} className="space-y-3">
            <input type="hidden" name="activityId" value={itemId} />
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
