"use server";

import { redirect } from "next/navigation";
import { and, desc, eq, inArray, like } from "drizzle-orm";

import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  contentItems,
  courses,
  modules,
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
  sections,
} from "@/lib/schema";
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

export async function importOpenstaxBookToCourseAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const bookId = (formData.get("bookId") as string | null)?.trim();

  if (!courseId || !bookId) {
    redirect("/dashboard?error=Missing+course+or+book");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: (c, { eq }) => eq(c.id, courseId),
  });
  if (!course) redirect("/dashboard?error=Course+not+found");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${courseId}?error=Not+authorized`);
  }

  const book = await db.query.openstaxBooks.findFirst({
    columns: { id: true, title: true },
    where: (b, { eq }) => eq(b.id, bookId),
  });
  if (!book) redirect(`/courses/${courseId}?tab=import&error=Book+not+found`);

  // Block re-import of the same book into the same course.
  const alreadyImported = await db
    .select({ id: modules.id })
    .from(modules)
    .where(
      and(
        eq(modules.courseId, courseId),
        like(modules.sourceRef, `openstax:book:${bookId}:%`),
      ),
    )
    .limit(1);
  if (alreadyImported.length > 0) {
    redirect(`/courses/${courseId}?tab=import&error=Book+already+imported`);
  }

  const bookChapters = await db
    .select()
    .from(openstaxChapters)
    .where(eq(openstaxChapters.bookId, bookId))
    .orderBy(openstaxChapters.chapterNumber);

  const bookSections = bookChapters.length
    ? await db
        .select()
        .from(openstaxSections)
        .where(inArray(openstaxSections.chapterId, bookChapters.map((c) => c.id)))
        .orderBy(openstaxSections.order)
    : [];

  const sectionsByChapter = new Map<string, typeof bookSections>();
  for (const s of bookSections) {
    const arr = sectionsByChapter.get(s.chapterId) ?? [];
    arr.push(s);
    sectionsByChapter.set(s.chapterId, arr);
  }

  const last = await db
    .select({ order: modules.order })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.order))
    .limit(1);
  let nextModuleOrder = (last[0]?.order ?? 0) + 1;

  for (const chapter of bookChapters) {
    const moduleId = crypto.randomUUID();
    await db.insert(modules).values({
      id: moduleId,
      courseId,
      title: chapter.title,
      order: nextModuleOrder++,
      sourceRef: `openstax:book:${bookId}:chapter:${chapter.id}`,
    });

    const chSections = sectionsByChapter.get(chapter.id) ?? [];
    let sectionOrder = 1;
    for (const sec of chSections) {
      await db.insert(sections).values({
        id: crypto.randomUUID(),
        moduleId,
        title: sec.title,
        order: sectionOrder++,
        sourceRef: `openstax:book:${bookId}:section:${sec.id}`,
      });
    }
  }

  redirect(
    `/courses/${courseId}?tab=modules&notice=${encodeURIComponent(`Imported ${book.title}`)}`,
  );
}

export async function importOpenstaxSectionAsReadActivityAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const titleOverride = (formData.get("title") as string | null)?.trim();

  if (!sectionId) redirect("/dashboard?error=Missing+section");

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();

  const secRow = await db
    .select({
      sectionId: sections.id,
      sourceRef: sections.sourceRef,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(sections)
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(sections.id, sectionId))
    .limit(1);

  const sec = secRow[0];
  if (!sec?.courseId) redirect("/dashboard?error=Section+not+found");

  const isOwner = user.role === "instructor" && user.id === sec.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${sec.courseId}?error=Not+authorized`);
  }

  const match = sec.sourceRef?.match(/^openstax:book:[^:]+:section:(.+)$/);
  const openstaxSectionId = match?.[1];
  if (!openstaxSectionId) {
    redirect(
      `/courses/${sec.courseId}?tab=modules&error=${encodeURIComponent("Section is not linked to an OpenStax source")}`,
    );
  }

  const openstaxSection = await db.query.openstaxSections.findFirst({
    where: (s, { eq }) => eq(s.id, openstaxSectionId!),
  });
  if (!openstaxSection) {
    redirect(
      `/courses/${sec.courseId}?tab=modules&error=${encodeURIComponent("OpenStax section not found")}`,
    );
  }
  if (!openstaxSection.contentHtml) {
    redirect(
      `/courses/${sec.courseId}?tab=modules&error=${encodeURIComponent("OpenStax section has no content")}`,
    );
  }

  const last = await db
    .select({ order: contentItems.order })
    .from(contentItems)
    .where(eq(contentItems.sectionId, sectionId))
    .orderBy(desc(contentItems.order))
    .limit(1);
  const order = (last[0]?.order ?? 0) + 1;

  await db.insert(contentItems).values({
    id: crypto.randomUUID(),
    sectionId,
    type: "read",
    title: titleOverride || openstaxSection.title,
    content: openstaxSection.contentHtml,
    contentPayload: JSON.stringify({
      fileType: "html",
      openstaxSectionId,
      sourceRef: sec.sourceRef,
    }),
    sourceRef: sec.sourceRef,
    order,
  });

  redirect(`/courses/${sec.courseId}?tab=modules&notice=${encodeURIComponent("Imported Read activity from OpenStax")}`);
}
