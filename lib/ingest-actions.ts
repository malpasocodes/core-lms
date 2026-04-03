"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { courses, modules, sections, contentItems } from "@/lib/schema";
import { requireAdmin } from "@/lib/auth";

interface NormalizedSource {
  filename: string;
  title: string;
}

interface NormalizedBlock {
  type: string;
  text?: string;
  label?: string;
  caption?: string;
  page?: number;
}

interface NormalizedSection {
  section_number: string;
  title: string;
  blocks: NormalizedBlock[];
}

interface NormalizedChapter {
  chapter_number: number;
  title: string;
  sections: NormalizedSection[];
}

interface NormalizedCourse {
  schema_version?: string;
  source: NormalizedSource;
  chapters: NormalizedChapter[];
}

export async function ingestNormalizedCourseAction(formData: FormData) {
  await requireAdmin();

  const jsonContent = formData.get("jsonContent") as string;
  const instructorId = formData.get("instructorId") as string;

  if (!jsonContent || !instructorId) {
    redirect("/admin/ingest?error=Missing required fields");
  }

  let data: NormalizedCourse;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    redirect("/admin/ingest?error=Invalid JSON format");
  }

  if (!data.source?.title || !data.chapters?.length) {
    redirect("/admin/ingest?error=Invalid course structure");
  }

  const db = await getDb();

  // 1. Create Course
  const courseId = crypto.randomUUID();
  await db.insert(courses).values({
    id: courseId,
    title: data.source.title,
    instructorId,
    sourceMetadata: JSON.stringify(data.source),
    published: "false",
  });

  // 2. Create Modules (chapters) and Content Items (sections)
  for (const [chapterIndex, chapter] of data.chapters.entries()) {
    const moduleId = crypto.randomUUID();
    await db.insert(modules).values({
      id: moduleId,
      courseId,
      title: `Chapter ${chapter.chapter_number}: ${chapter.title}`,
      order: chapterIndex + 1,
      sourceRef: String(chapter.chapter_number),
    });

    // 3. Create Sections and their ContentItems
    for (const [sectionIndex, section] of chapter.sections.entries()) {
      const sectionId = crypto.randomUUID();
      await db.insert(sections).values({
        id: sectionId,
        moduleId,
        title: `${section.section_number} ${section.title}`,
        order: sectionIndex + 1,
        sourceRef: section.section_number,
      });

      await db.insert(contentItems).values({
        id: crypto.randomUUID(),
        sectionId,
        type: "normalized_text",
        title: `${section.section_number} ${section.title}`,
        content: "",
        contentPayload: JSON.stringify(section.blocks),
        sourceRef: section.section_number,
        order: 1,
      });
    }
  }

  redirect(`/courses/${courseId}?notice=Course imported successfully`);
}
