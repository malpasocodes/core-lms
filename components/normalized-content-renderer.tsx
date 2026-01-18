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

export function NormalizedContentRenderer({ blocks }: NormalizedContentRendererProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="whitespace-pre-wrap text-foreground">
              {block.text}
            </p>
          );
        }
        if (block.type === "placeholder") {
          return (
            <div
              key={i}
              className="border rounded p-4 bg-muted/50 text-center"
            >
              <span className="text-muted-foreground">[{block.label}]</span>
              {block.caption && (
                <p className="text-sm mt-1 text-muted-foreground">{block.caption}</p>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
