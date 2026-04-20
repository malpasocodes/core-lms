import Link from "next/link";

import { getDb } from "@/lib/db";
import { openstaxBooks } from "@/lib/schema";
import { fetchOpenstaxCatalog, type OsBookMeta } from "@/lib/openstax-client";
import { ingestOpenstaxBookAction } from "@/lib/openstax-actions";
import { Button } from "@/components/ui/button";

export default async function AdminOpenstaxPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;

  const db = await getDb();
  const ingested = await db.select().from(openstaxBooks).orderBy(openstaxBooks.title);
  const ingestedIds = new Set(ingested.map((b) => b.id));

  let catalog: OsBookMeta[] = [];
  let catalogError: string | null = null;
  try {
    catalog = await fetchOpenstaxCatalog();
  } catch (err) {
    catalogError = err instanceof Error ? err.message : "Failed to load catalog";
  }

  // Books in catalog but not yet ingested
  const available = catalog.filter((b) => !ingestedIds.has(b.slug));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">OpenStax Library</h1>
        <p className="text-sm text-muted-foreground">
          Ingest OpenStax textbooks into the content library.
        </p>
      </div>

      {params.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {params.error}
        </div>
      )}
      {params.notice && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
          {params.notice}
        </div>
      )}

      {/* Ingested books */}
      {ingested.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Ingested Books</p>
            <p className="text-xs text-muted-foreground">Stored in content library.</p>
          </div>
          <div className="overflow-hidden rounded-md border border-border/70">
            <div className="grid grid-cols-[2fr_1fr_0.5fr_auto] bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Title</span>
              <span>Subject</span>
              <span>Chapters</span>
              <span />
            </div>
            <div className="divide-y divide-border bg-background/80 text-sm text-foreground">
              {ingested.map((book) => (
                <div
                  key={book.id}
                  className="grid grid-cols-[2fr_1fr_0.5fr_auto] items-center gap-2 px-3 py-2"
                >
                  <Link
                    href={`/admin/openstax/${book.id}`}
                    className="font-semibold underline"
                  >
                    {book.title}
                  </Link>
                  <span className="text-muted-foreground">{book.subject ?? "—"}</span>
                  <span className="font-semibold">{book.chapterCount ?? "—"}</span>
                  <Link
                    href={`/admin/openstax/${book.id}`}
                    className="text-xs text-muted-foreground underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available catalog */}
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Available Books</p>
          <p className="text-xs text-muted-foreground">
            Select a book to ingest its chapters and sections.
          </p>
        </div>

        {catalogError ? (
          <p className="text-sm text-destructive">{catalogError}</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {catalog.length === 0
              ? "No books found in the OpenStax catalog."
              : "All available books have been ingested."}
          </p>
        ) : (
          <div className="space-y-2">
            {available.map((book) => (
              <div
                key={book.slug}
                className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">{book.title}</p>
                  {book.subject && (
                    <p className="text-xs text-muted-foreground">{book.subject}</p>
                  )}
                </div>
                <form action={ingestOpenstaxBookAction}>
                  <input type="hidden" name="bookId" value={book.slug} />
                  <input type="hidden" name="title" value={book.title} />
                  <input type="hidden" name="subject" value={book.subject} />
                  <input type="hidden" name="cnxId" value={book.cnxId} />
                  <input
                    type="hidden"
                    name="sourceUrl"
                    value={`https://openstax.org/details/books/${book.slug}`}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Ingest
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
