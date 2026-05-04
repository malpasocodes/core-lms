import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { openstaxBooks, openstaxChapters, openstaxSections } from "@/lib/schema";
import { deleteOpenstaxBookAction } from "@/lib/openstax-actions";
import { Button } from "@/components/ui/button";

export default async function OpenstaxBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { bookId } = await params;
  const sp = await searchParams;

  const db = await getDb();

  const book = await db.query.openstaxBooks.findFirst({
    where: eq(openstaxBooks.id, bookId),
  });
  if (!book) notFound();

  const chapters = await db
    .select()
    .from(openstaxChapters)
    .where(eq(openstaxChapters.bookId, bookId))
    .orderBy(openstaxChapters.chapterNumber);

  const sectionsByChapter = await Promise.all(
    chapters.map(async (ch) => {
      const sections = await db
        .select({
          id: openstaxSections.id,
          title: openstaxSections.title,
          order: openstaxSections.order,
        })
        .from(openstaxSections)
        .where(eq(openstaxSections.chapterId, ch.id))
        .orderBy(openstaxSections.order);
      return { chapter: ch, sections };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/openstax"
            className="text-xs text-muted-foreground underline"
          >
            ← OpenStax Library
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Admin · OpenStax
          </p>
          <h1 className="text-3xl font-semibold text-foreground">{book.title}</h1>
          {book.subject && (
            <p className="text-sm text-muted-foreground">{book.subject}</p>
          )}
          {book.ingestedAt && (
            <p className="text-xs text-muted-foreground">
              Ingested {new Date(book.ingestedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <form action={deleteOpenstaxBookAction}>
          <input type="hidden" name="bookId" value={book.id} />
          <Button type="submit" variant="destructive" size="sm">
            Remove Book
          </Button>
        </form>
      </div>

      {sp.notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {sp.notice}
        </div>
      )}
      {sp.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {sp.error}
        </div>
      )}

      <div className="space-y-3">
        {sectionsByChapter.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chapters found.</p>
        ) : (
          sectionsByChapter.map(({ chapter, sections }) => (
            <div
              key={chapter.id}
              className="rounded-xl border border-border/70 bg-card/80 p-4 space-y-2"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Chapter {chapter.chapterNumber}
                </p>
                <p className="text-sm font-semibold text-foreground">{chapter.title}</p>
              </div>
              {sections.length > 0 && (
                <div className="pl-3 border-l border-border/50 space-y-1">
                  {sections.map((s) => (
                    <p key={s.id} className="text-xs text-muted-foreground">
                      {s.title}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
