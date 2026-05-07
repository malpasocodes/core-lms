/**
 * Ingest "Calculus Made Easy" (Project Gutenberg #33283) into the
 * OpenStax content library tables so it appears in the existing
 * /admin/openstax workflow.
 *
 * Pipeline:
 *   1. node scripts/preprocess-cme.mjs 33283-t.tex /tmp/cme-clean.tex
 *   2. pandoc /tmp/cme-clean.tex -o /tmp/cme.html --mathjax --section-divs --syntax-highlighting=none
 *   3. npx tsx scripts/ingest-cme.ts /tmp/cme.html
 *
 * Maps each <section class="level1"> to one openstaxChapter, with a single
 * openstaxSection holding the chapter's full HTML.
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";

config({ path: ".env.local" });

import {
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
} from "../lib/schema";

const BOOK_ID = "gutenberg-33283";
const BOOK_TITLE = "Calculus Made Easy";
const BOOK_SUBJECT = "Mathematics";
const CNX_ID = "33283"; // Gutenberg ebook id (placeholder for required cnxId field)
const SOURCE_URL = "https://www.gutenberg.org/ebooks/33283";

interface Chapter {
  title: string;
  html: string;
}

function extractLevel1Sections(html: string): Chapter[] {
  // Walk all <section ...> opens and </section> closes, tracking depth.
  // When depth goes 0 → 1 with class containing "level1", record start.
  // When depth returns to 0, record end and grab inner HTML.
  const tagRe = /<\/?section\b[^>]*>/g;
  const chapters: Chapter[] = [];
  let depth = 0;
  let openStart = -1;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    if (tag.startsWith("</")) {
      depth--;
      if (depth === 0 && openStart >= 0) {
        const inner = html.slice(openStart, m.index);
        const titleMatch = inner.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const title = titleMatch
          ? stripTags(titleMatch[1]).replace(/\s+/g, " ").trim()
          : "Untitled";
        chapters.push({ title, html: inner });
        openStart = -1;
      }
    } else {
      const isLevel1 = /\bclass="[^"]*\blevel1\b/.test(tag);
      if (depth === 0 && isLevel1) {
        // record start as position right AFTER the opening tag
        openStart = m.index + tag.length;
      }
      depth++;
    }
  }
  return chapters;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

async function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error("Usage: tsx scripts/ingest-cme.ts <path-to-html>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const html = readFileSync(htmlPath, "utf-8");
  const chapters = extractLevel1Sections(html);
  if (chapters.length === 0) {
    console.error("No level1 sections found in HTML");
    process.exit(1);
  }
  console.log(`Found ${chapters.length} chapters`);
  chapters.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}`));

  const neonClient = neon(connectionString);
  const db = drizzle(neonClient);

  // Wipe any prior ingest of this book so re-runs are idempotent
  await db.delete(openstaxBooks).where(eq(openstaxBooks.id, BOOK_ID));

  await db.insert(openstaxBooks).values({
    id: BOOK_ID,
    title: BOOK_TITLE,
    subject: BOOK_SUBJECT,
    cnxId: CNX_ID,
    sourceUrl: SOURCE_URL,
    chapterCount: chapters.length,
    ingestedAt: new Date(),
  });

  for (const [i, chapter] of chapters.entries()) {
    const chapterNumber = i + 1;
    const chapterId = `${BOOK_ID}-${chapterNumber}`;
    await db.insert(openstaxChapters).values({
      id: chapterId,
      bookId: BOOK_ID,
      chapterNumber,
      title: chapter.title,
    });
    await db.insert(openstaxSections).values({
      id: `${chapterId}-1`,
      chapterId,
      title: chapter.title,
      contentHtml: chapter.html,
      order: 1,
    });
  }

  console.log(`\nIngested book "${BOOK_TITLE}" (${BOOK_ID}) with ${chapters.length} chapters`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
