"use server";

import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, assessments, courses, mcqQuestions, modules, sections } from "@/lib/schema";

type GeneratedQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export async function generateMcqFromPdfAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activityId = (formData.get("activityId") as string | null)?.trim();
  const numQuestionsRaw = (formData.get("numQuestions") as string | null)?.trim() ?? "10";
  if (!activityId) redirect("/dashboard?error=Missing%20activity");

  const numQuestions = Math.min(Math.max(parseInt(numQuestionsRaw, 10) || 10, 3), 20);

  const db = await getDb();

  const itemRow = await db
    .select({
      activityId: activities.id,
      activityTitle: activities.title,
      activityType: activities.type,
      activityContent: activities.content,
      activityPayload: activities.contentPayload,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(activities.id, activityId))
    .limit(1);

  const item = itemRow[0];
  if (!item) redirect("/dashboard?error=Activity%20not%20found");

  let payload: { fileType?: string } = {};
  try {
    payload = item.activityPayload ? JSON.parse(item.activityPayload) : {};
  } catch {
    payload = {};
  }
  if (item.activityType !== "read" || payload.fileType !== "pdf") {
    redirect(`/courses/${item.courseId}?error=Activity%20is%20not%20a%20PDF%20Read`);
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${item.courseId}?error=Not%20authorized`);
  }

  let pdfBase64: string;
  try {
    const resp = await fetch(item.activityContent);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch {
    redirect(`/courses/${item.courseId}/activities/${activityId}?error=Failed%20to%20fetch%20PDF`);
  }

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
    redirect(`/courses/${item.courseId}/activities/${activityId}?error=AI%20generation%20failed`);
  }

  const lastAssessment = await db
    .select({ order: assessments.order })
    .from(assessments)
    .where(eq(assessments.activityId, activityId))
    .orderBy(desc(assessments.order))
    .limit(1);
  const nextOrder = (lastAssessment[0]?.order ?? 0) + 1;

  const assessmentId = crypto.randomUUID();

  await db.insert(assessments).values({
    id: assessmentId,
    activityId,
    type: "mcq",
    title: `Quiz: ${item.activityTitle}`,
    description: `Auto-generated MCQ quiz from "${item.activityTitle}". ${questions.length} questions.`,
    graded: false,
    mcqModel: model,
    order: nextOrder,
  });

  await db.insert(mcqQuestions).values(
    questions.map((q, i) => ({
      id: crypto.randomUUID(),
      assessmentId,
      order: i + 1,
      questionText: q.question,
      options: JSON.stringify(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? null,
    }))
  );

  redirect(`/courses/${item.courseId}/activities/${activityId}?notice=Quiz%20created`);
}
