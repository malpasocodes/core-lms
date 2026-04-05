"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assignments, contentItems, courses, mcqQuestions, modules, sections } from "@/lib/schema";

type GeneratedQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export async function generateMcqFromPdfAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const contentItemId = (formData.get("contentItemId") as string | null)?.trim();
  const numQuestionsRaw = (formData.get("numQuestions") as string | null)?.trim() ?? "10";
  if (!contentItemId) redirect("/dashboard?error=Missing%20content%20item");

  const numQuestions = Math.min(Math.max(parseInt(numQuestionsRaw, 10) || 10, 3), 20);

  const db = await getDb();

  const itemRow = await db
    .select({
      itemId: contentItems.id,
      itemTitle: contentItems.title,
      itemType: contentItems.type,
      itemContent: contentItems.content,
      sectionId: sections.id,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(contentItems)
    .leftJoin(sections, eq(contentItems.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(contentItems.id, contentItemId))
    .limit(1);

  const item = itemRow[0];
  if (!item) redirect("/dashboard?error=Content%20item%20not%20found");
  if (item.itemType !== "pdf") redirect(`/courses/${item.courseId}?error=Item%20is%20not%20a%20PDF`);

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${item.courseId}?error=Not%20authorized`);
  }

  // Fetch PDF bytes from R2 public URL
  let pdfBase64: string;
  try {
    const resp = await fetch(item.itemContent);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch {
    redirect(`/courses/${item.courseId}/activities/${contentItemId}?error=Failed%20to%20fetch%20PDF`);
  }

  // Call Claude API with native PDF support
  const model = process.env.MCQ_MODEL ?? "claude-sonnet-4-6";
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let questions: GeneratedQuestion[];
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `Generate exactly ${numQuestions} multiple-choice questions based on the content of this PDF document.
Return ONLY a JSON array with no markdown fencing or extra commentary. Each element must have:
- "question": string (the question text)
- "options": array of exactly 4 strings (the answer choices)
- "correctIndex": integer 0-3 (index of the correct option)
- "explanation": string (brief explanation of why the answer is correct)

Focus on key concepts, definitions, and important facts. Make distractors plausible but clearly incorrect.`,
            },
          ],
        },
      ],
    });

    const raw = (message.content[0] as { type: "text"; text: string }).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid response shape");
    questions = parsed;
  } catch {
    redirect(`/courses/${item.courseId}/activities/${contentItemId}?error=AI%20generation%20failed`);
  }

  // Create the assignment and questions
  const assignmentId = crypto.randomUUID();

  await db.insert(assignments).values({
    id: assignmentId,
    courseId: item.courseId!,
    sectionId: item.sectionId ?? null,
    title: `Quiz: ${item.itemTitle}`,
    description: `Auto-generated MCQ quiz from "${item.itemTitle}". ${questions.length} questions.`,
    type: "mcq",
    sourceContentItemId: contentItemId,
    mcqModel: model,
  });

  await db.insert(mcqQuestions).values(
    questions.map((q, i) => ({
      id: crypto.randomUUID(),
      assignmentId,
      order: i + 1,
      questionText: q.question,
      options: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? null,
    }))
  );

  redirect(`/courses/${item.courseId}/assignments/${assignmentId}?notice=Quiz%20created`);
}
