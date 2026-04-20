"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openstaxBooks, openstaxChapters, openstaxSections } from "@/lib/schema";
import { fetchBookToc, fetchSectionHtml } from "@/lib/openstax-client";

export async function ingestOpenstaxBookAction(formData: FormData) {
  await requireAdmin();

  const bookId = (formData.get("bookId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const cnxId = (formData.get("cnxId") as string | null)?.trim();
  const sourceUrl = (formData.get("sourceUrl") as string | null)?.trim() ?? "";

  if (!bookId || !title || !cnxId) {
    redirect("/admin/openstax?error=Missing+required+fields");
  }

  const db = await getDb();

  let toc;
  try {
    toc = await fetchBookToc(cnxId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch book";
    redirect(`/admin/openstax?error=${encodeURIComponent(msg)}`);
  }
  const { bookVersion, chapters } = toc;

  // Wipe existing data for this book so re-ingest is clean
  await db.delete(openstaxBooks).where(eq(openstaxBooks.id, bookId));

  await db.insert(openstaxBooks).values({
    id: bookId,
    title,
    subject: subject || null,
    cnxId,
    sourceUrl: sourceUrl || null,
    chapterCount: chapters.length,
    ingestedAt: new Date(),
  });

  for (const chapter of chapters) {
    const chapterId = `${bookId}-${chapter.chapterNumber}`;
    await db.insert(openstaxChapters).values({
      id: chapterId,
      bookId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
    });

    // Fetch section HTML in batches of 8 to avoid hammering the archive API
    const BATCH = 8;
    for (let i = 0; i < chapter.sections.length; i += BATCH) {
      const batch = chapter.sections.slice(i, i + BATCH);
      const htmlResults = await Promise.allSettled(
        batch.map((s) => fetchSectionHtml(cnxId, bookVersion, s.id))
      );

      for (let j = 0; j < batch.length; j++) {
        const section = batch[j];
        const result = htmlResults[j];
        const html = result.status === "fulfilled" ? result.value : "";
        await db.insert(openstaxSections).values({
          id: section.id,
          chapterId,
          title: section.title,
          contentHtml: html || null,
          order: section.order,
        });
      }
    }
  }

  redirect(`/admin/openstax/${bookId}?notice=Ingestion+complete`);
}

export async function deleteOpenstaxBookAction(formData: FormData) {
  await requireAdmin();
  const bookId = (formData.get("bookId") as string | null)?.trim();
  if (!bookId) redirect("/admin/openstax?error=Missing+book");

  const db = await getDb();
  await db.delete(openstaxBooks).where(eq(openstaxBooks.id, bookId));
  redirect("/admin/openstax?notice=Book+removed");
}
