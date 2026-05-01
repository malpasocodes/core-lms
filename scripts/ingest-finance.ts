/**
 * Script to ingest finance_normalized.json into an existing Finance course
 *
 * Usage: npx tsx scripts/ingest-finance.ts
 *
 * Requirements:
 * - DATABASE_URL must be set in .env.local
 * - A course with title containing "Finance" must exist
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, ilike } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Import schema types
import { courses, modules, sections, activities } from "../lib/schema";

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
  source: {
    filename: string;
    title: string;
  };
  chapters: NormalizedChapter[];
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const neonClient = neon(connectionString);
  const db = drizzle(neonClient);

  // Read the JSON file
  const jsonPath = join(process.cwd(), "data", "finance_normalized.json");
  console.log(`Reading JSON from: ${jsonPath}`);

  let data: NormalizedCourse;
  try {
    const jsonContent = readFileSync(jsonPath, "utf-8");
    data = JSON.parse(jsonContent);
  } catch (err) {
    console.error("ERROR: Failed to read or parse JSON file:", err);
    process.exit(1);
  }

  console.log(`Parsed course: "${data.source.title}"`);
  console.log(`Chapters: ${data.chapters.length}`);

  // Find the Finance course
  const existingCourses = await db
    .select()
    .from(courses)
    .where(ilike(courses.title, "%finance%"));

  if (existingCourses.length === 0) {
    console.error("ERROR: No course with 'Finance' in the title found");
    process.exit(1);
  }

  if (existingCourses.length > 1) {
    console.log("Found multiple Finance courses:");
    existingCourses.forEach((c, i) => console.log(`  ${i + 1}. ${c.title} (${c.id})`));
    console.log("Using the first one...");
  }

  const course = existingCourses[0];
  console.log(`Using course: "${course.title}" (${course.id})`);

  // Check for existing modules in this course
  const existingModules = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id));

  if (existingModules.length > 0) {
    console.log(`WARNING: Course already has ${existingModules.length} modules`);
    console.log("Deleting existing modules and activities...");

    // Delete existing modules (activities will cascade)
    for (const mod of existingModules) {
      await db.delete(modules).where(eq(modules.id, mod.id));
    }
    console.log("Existing content cleared.");
  }

  // Update course source metadata
  await db
    .update(courses)
    .set({ sourceMetadata: JSON.stringify(data.source) })
    .where(eq(courses.id, course.id));

  // Insert modules (chapters) and content items (sections)
  let totalSections = 0;

  for (const [chapterIndex, chapter] of data.chapters.entries()) {
    const moduleId = crypto.randomUUID();
    const moduleTitle = `Chapter ${chapter.chapter_number}: ${chapter.title}`;

    await db.insert(modules).values({
      id: moduleId,
      courseId: course.id,
      title: moduleTitle,
      order: chapterIndex + 1,
      sourceRef: String(chapter.chapter_number),
    });

    console.log(`  Created module: ${moduleTitle}`);

    // Create sections and their activities
    for (const [sectionIndex, section] of chapter.sections.entries()) {
      const sectionId = crypto.randomUUID();
      const sectionTitle = `${section.section_number} ${section.title}`;
      await db.insert(sections).values({
        id: sectionId,
        moduleId,
        title: sectionTitle,
        order: sectionIndex + 1,
        sourceRef: section.section_number,
      });
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        sectionId,
        type: "read",
        title: sectionTitle,
        content: "",
        contentPayload: JSON.stringify({ fileType: "normalized", blocks: section.blocks }),
        sourceRef: section.section_number,
        order: 1,
      });
      totalSections++;
    }

    console.log(`    - ${chapter.sections.length} sections`);
  }

  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Course: ${course.title}`);
  console.log(`Modules created: ${data.chapters.length}`);
  console.log(`Activities created: ${totalSections}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
