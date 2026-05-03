import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { activities, activityNotes } from "@/lib/schema";
import { getActiveModel } from "@/lib/settings";

type AnalysisResult = { score: number; analysis: string };

const PROMPT = `You are evaluating a learner's notes from watching a video lecture against the official transcript.

Score the notes from 1 to 10 on how well they capture the key concepts, ideas, and details from the video. Use this rubric:
- 9-10: Comprehensive coverage of all major points with accurate detail
- 7-8: Solid coverage of most major points; minor gaps or imprecisions
- 5-6: Captures some key ideas but misses important content or contains inaccuracies
- 3-4: Sparse or surface-level; significant gaps
- 1-2: Minimal engagement; little evidence the learner watched attentively

Then write a 1-2 paragraph analysis (max ~200 words) covering:
- What the notes captured well
- What was missed or misrepresented
- Suggestions for improvement

Return ONLY a JSON object with no markdown fencing or extra commentary, in this exact shape:
{ "score": <integer 1-10>, "analysis": "<text>" }`;

function parseResult(raw: string): AnalysisResult {
  const trimmed = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(trimmed);
  const score = Number(parsed.score);
  const analysis = String(parsed.analysis ?? "").trim();
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error("Invalid score in response");
  }
  if (!analysis) throw new Error("Empty analysis in response");
  return { score, analysis };
}

function buildUserText(transcript: string, notes: string) {
  return `${PROMPT}\n\nTranscript:\n${transcript}\n\nLearner notes:\n${notes}`;
}

async function runAnthropic(modelId: string, transcript: string, notes: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildUserText(transcript, notes) }],
  });
  const raw = (message.content[0] as { type: "text"; text: string }).text;
  return parseResult(raw);
}

async function runMistral(modelId: string, transcript: string, notes: string) {
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
  const resp = await mistral.chat.complete({
    model: modelId,
    maxTokens: 1024,
    messages: [{ role: "user", content: buildUserText(transcript, notes) }],
  });
  const content = resp.choices[0]?.message?.content;
  const raw =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((chunk) =>
              chunk && typeof chunk === "object" && "type" in chunk && chunk.type === "text"
                ? (chunk as { text: string }).text
                : ""
            )
            .join("")
        : "";
  if (!raw) throw new Error("Empty Mistral response");
  return parseResult(raw);
}

export async function analyzeWatchNotes(activityId: string, userId: string): Promise<void> {
  const db = await getDb();

  const noteRow = await db.query.activityNotes.findFirst({
    columns: { id: true, notes: true },
    where: (n, { and, eq }) => and(eq(n.activityId, activityId), eq(n.userId, userId)),
  });
  if (!noteRow || !noteRow.notes.trim()) return;

  const activityRow = await db
    .select({ payload: activities.contentPayload, type: activities.type })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);
  const activity = activityRow[0];
  if (!activity || activity.type !== "watch") return;

  let transcript = "";
  try {
    const payload = activity.payload ? JSON.parse(activity.payload) : {};
    if (typeof payload.transcript === "string") transcript = payload.transcript.trim();
  } catch {
    // ignore parse errors — treated as missing transcript
  }
  if (!transcript) {
    await db
      .update(activityNotes)
      .set({ aiStatus: "failed", aiAnalyzedAt: new Date() })
      .where(and(eq(activityNotes.activityId, activityId), eq(activityNotes.userId, userId)));
    return;
  }

  const activeModel = await getActiveModel();

  try {
    const result =
      activeModel.provider === "anthropic"
        ? await runAnthropic(activeModel.id, transcript, noteRow.notes)
        : await runMistral(activeModel.id, transcript, noteRow.notes);

    await db
      .update(activityNotes)
      .set({
        aiScore: result.score,
        aiAnalysis: result.analysis,
        aiModel: activeModel.id,
        aiStatus: "complete",
        aiAnalyzedAt: new Date(),
      })
      .where(and(eq(activityNotes.activityId, activityId), eq(activityNotes.userId, userId)));
  } catch {
    await db
      .update(activityNotes)
      .set({ aiStatus: "failed", aiAnalyzedAt: new Date() })
      .where(and(eq(activityNotes.activityId, activityId), eq(activityNotes.userId, userId)));
  }
}
