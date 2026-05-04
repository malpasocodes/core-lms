"use client";

interface Block {
  type: "paragraph" | "placeholder";
  text?: string;
  label?: string;
  caption?: string;
  page?: number;
}

interface NormalizedContentRendererProps {
  blocks: Block[];
}

// Detect page number artifacts like "8 1 • Introduction to Finance" or "1.1 • What Is Finance? 9"
function isPageArtifact(text: string): boolean {
  const trimmed = text.trim();
  // Matches patterns like "10 1 • Introduction" or "1.1 • Title 9"
  if (/^\d+\s+\d+\s*•/.test(trimmed)) return true;
  if (/•.*\d+$/.test(trimmed) && trimmed.length < 50) return true;
  // Just a number
  if (/^\d+$/.test(trimmed)) return true;
  // "Access for free at openstax.org"
  if (trimmed.toLowerCase().includes("access for free at")) return true;
  return false;
}

// Detect if this looks like a heading (short, no period at end, title case or all caps)
function isHeading(text: string): boolean {
  const trimmed = text.trim();
  // Too long for a heading
  if (trimmed.length > 80) return false;
  // Has multiple sentences
  if ((trimmed.match(/\./g) || []).length > 1) return false;
  // Ends with punctuation other than question mark (likely not a heading)
  if (/[,;:]$/.test(trimmed)) return false;
  // Short phrases that look like headings
  const words = trimmed.split(/\s+/);
  if (words.length <= 6 && !trimmed.endsWith(".")) return true;
  // Known heading patterns
  if (/^(Learning Outcomes|Why It Matters|Definition of|Basic Areas|Summary|Key Terms|Review Questions)/i.test(trimmed)) return true;
  return false;
}

// Detect if this is a bullet list (lines starting with • or -)
function isBulletList(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  const bulletLines = lines.filter((l) => /^[•\-\*]\s/.test(l.trim()));
  return bulletLines.length >= lines.length * 0.7;
}

// Detect if this is a numbered list
function isNumberedList(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  const numberedLines = lines.filter((l) => /^\d+[\.\)]\s/.test(l.trim()));
  return numberedLines.length >= lines.length * 0.5;
}

// Detect figure/table references
function isFigureReference(text: string): boolean {
  const trimmed = text.trim();
  return /^(Figure|Table)\s*\d+\.\d+/i.test(trimmed) && trimmed.length < 100;
}

// Render a bullet list
function renderBulletList(text: string, key: number) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <ul key={key} className="list-disc list-outside ml-6 space-y-1.5 text-slate-900/90">
      {lines.map((line, i) => (
        <li key={i} className="leading-relaxed">
          {line.replace(/^[•\-\*]\s*/, "")}
        </li>
      ))}
    </ul>
  );
}

// Render a numbered list
function renderNumberedList(text: string, key: number) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <ol key={key} className="list-decimal list-outside ml-6 space-y-3 text-slate-900/90">
      {lines.map((line, i) => (
        <li key={i} className="leading-relaxed pl-1">
          {line.replace(/^\d+[\.\)]\s*/, "")}
        </li>
      ))}
    </ol>
  );
}

export function NormalizedContentRenderer({ blocks }: NormalizedContentRendererProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <div className="space-y-5">
        {blocks.map((block, i) => {
          if (block.type === "paragraph" && block.text) {
            const text = block.text;

            // Skip page artifacts
            if (isPageArtifact(text)) {
              return null;
            }

            // Figure/table reference
            if (isFigureReference(text)) {
              return (
                <p key={i} className="text-sm font-medium text-slate-500 italic my-4">
                  {text}
                </p>
              );
            }

            // Heading
            if (isHeading(text)) {
              return (
                <h3 key={i} className="text-lg font-semibold text-slate-900 mt-8 mb-3 first:mt-0">
                  {text}
                </h3>
              );
            }

            // Bullet list
            if (isBulletList(text)) {
              return renderBulletList(text, i);
            }

            // Numbered list
            if (isNumberedList(text)) {
              return renderNumberedList(text, i);
            }

            // Regular paragraph
            return (
              <p key={i} className="text-slate-900/90 leading-7 text-[0.95rem]">
                {text}
              </p>
            );
          }

          if (block.type === "placeholder") {
            return (
              <figure
                key={i}
                className="my-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center"
              >
                <div className="text-slate-500 font-medium">[{block.label}]</div>
                {block.caption && (
                  <figcaption className="text-sm mt-2 text-slate-500/80">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          }

          return null;
        })}
      </div>
    </article>
  );
}
