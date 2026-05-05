import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openstaxBooks, openstaxChapters, openstaxSections } from "@/lib/schema";
import { updateOpenstaxSectionHtmlAction } from "@/lib/openstax-actions";
import { HtmlItemEditor } from "@/components/html-item-editor";

export default async function OpenstaxSectionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; sectionId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireAdmin();
  const { bookId, sectionId } = await params;
  const sp = await searchParams;

  const db = await getDb();

  const row = await db
    .select({
      section: openstaxSections,
      chapter: openstaxChapters,
      book: openstaxBooks,
    })
    .from(openstaxSections)
    .leftJoin(openstaxChapters, eq(openstaxSections.chapterId, openstaxChapters.id))
    .leftJoin(openstaxBooks, eq(openstaxChapters.bookId, openstaxBooks.id))
    .where(eq(openstaxSections.id, sectionId))
    .limit(1);

  const data = row[0];
  if (!data?.section || !data.book || data.book.id !== bookId) notFound();

  const redirectTo = `/admin/openstax/${bookId}/sections/${sectionId}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/openstax/${bookId}`}
          className="text-xs text-slate-500 underline"
        >
          ← {data.book.title}
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">
          Admin · OpenStax · Edit Section
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {data.section.title}
        </h1>
        {data.chapter && (
          <p className="text-sm text-slate-500">
            Chapter {data.chapter.chapterNumber} · {data.chapter.title}
          </p>
        )}
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

      <HtmlItemEditor
        itemId={data.section.id}
        initialTitle={data.section.title}
        initialContent={data.section.contentHtml ?? ""}
        redirectTo={redirectTo}
        saveAction={updateOpenstaxSectionHtmlAction}
        uploadIdField="openstaxSectionId"
      />
    </div>
  );
}
