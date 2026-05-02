"use server";

import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, assessments, courses, mcqQuestions, modules, sections } from "@/lib/schema";
import { getActiveModel } from "@/lib/settings";

type GeneratedQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

function buildPrompt(numQuestions: number) {
  return `Generate exactly ${numQuestions} multiple-choice questions based on the source content provided.
Return ONLY a JSON array with no markdown fencing or extra commentary. Each element must have:
- "question": string (the question text)
- "options": array of exactly 4 strings (the answer choices)
- "correctIndex": integer 0-3 (index of the correct option)
- "explanation": string (brief explanation of why the answer is correct)

Focus on key concepts, definitions, and important facts. Make distractors plausible but clearly incorrect.`;
}

function parseQuestions(raw: string): GeneratedQuestion[] {
  const trimmed = raw.trim();
  const jsonStr = trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid response shape");
  return parsed;
}

type Source =
  | { kind: "pdf"; url: string }
  | { kind: "markdown"; text: string }
  | { kind: "transcript"; text: string };

function textSourceLabel(kind: "markdown" | "transcript") {
  return kind === "transcript" ? "Video transcript" : "Markdown";
}

async function generateWithAnthropic(
  modelId: string,
  source: Source,
  numQuestions: number
): Promise<GeneratedQuestion[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let userContent: Anthropic.Messages.ContentBlockParam[];
  if (source.kind === "pdf") {
    const resp = await fetch(source.url);
    if (!resp.ok) throw new Error(`Failed to fetch PDF (HTTP ${resp.status})`);
    const buffer = await resp.arrayBuffer();
    const pdfBase64 = Buffer.from(buffer).toString("base64");
    userContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      },
      { type: "text", text: buildPrompt(numQuestions) },
    ];
  } else {
    userContent = [
      {
        type: "text",
        text: `${buildPrompt(numQuestions)}\n\nSource content (${textSourceLabel(source.kind)}):\n\n${source.text}`,
      },
    ];
  }

  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 4096,
    messages: [{ role: "user", content: userContent }],
  });

  const raw = (message.content[0] as { type: "text"; text: string }).text;
  return parseQuestions(raw);
}

async function generateWithMistral(
  modelId: string,
  source: Source,
  numQuestions: number
): Promise<GeneratedQuestion[]> {
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

  const userContent =
    source.kind === "pdf"
      ? [
          { type: "document_url" as const, documentUrl: source.url },
          { type: "text" as const, text: buildPrompt(numQuestions) },
        ]
      : [
          {
            type: "text" as const,
            text: `${buildPrompt(numQuestions)}\n\nSource content (${textSourceLabel(source.kind)}):\n\n${source.text}`,
          },
        ];

  const resp = await mistral.chat.complete({
    model: modelId,
    maxTokens: 4096,
    messages: [{ role: "user", content: userContent }],
  });

  const content = resp.choices[0]?.message?.content;
  const raw =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((chunk) => {
              if (chunk && typeof chunk === "object" && "type" in chunk && chunk.type === "text") {
                return (chunk as { text: string }).text;
              }
              return "";
            })
            .join("")
        : "";
  if (!raw) throw new Error("Empty Mistral response");
  return parseQuestions(raw);
}

export async function generateMcqFromActivityAction(formData: FormData) {
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

  let payload: { fileType?: string; transcript?: string } = {};
  try {
    payload = item.activityPayload ? JSON.parse(item.activityPayload) : {};
  } catch {
    payload = {};
  }

  const isReadPdfOrMarkdown =
    item.activityType === "read" &&
    (payload.fileType === "pdf" || payload.fileType === "markdown");
  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim() : "";
  const isWatchWithTranscript = item.activityType === "watch" && transcript.length > 0;

  if (!isReadPdfOrMarkdown && !isWatchWithTranscript) {
    redirect(`/courses/${item.courseId}?error=Activity%20does%20not%20support%20MCQ%20generation`);
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${item.courseId}?error=Not%20authorized`);
  }

  const activeModel = await getActiveModel();

  const source: Source = isWatchWithTranscript
    ? { kind: "transcript", text: transcript }
    : payload.fileType === "pdf"
      ? { kind: "pdf", url: item.activityContent }
      : { kind: "markdown", text: item.activityContent };

  let questions: GeneratedQuestion[];
  try {
    if (activeModel.provider === "anthropic") {
      questions = await generateWithAnthropic(activeModel.id, source, numQuestions);
    } else if (activeModel.provider === "mistral") {
      questions = await generateWithMistral(activeModel.id, source, numQuestions);
    } else {
      throw new Error(`Unsupported provider: ${activeModel.provider}`);
    }
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
    mcqModel: activeModel.id,
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
