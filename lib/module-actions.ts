"use server";

import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { uploadFileToR2, uploadPdfToR2 } from "@/lib/r2";
import {
  activities,
  activityNotes,
  assessments,
  completions,
  courses,
  modules,
  sections,
  submissions,
} from "@/lib/schema";

export async function createModuleAction(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  const courseId = (formData.get("courseId") as string | null)?.trim();
  if (!title || !courseId) {
    redirect(`/courses/${courseId}?error=Missing%20course%20or%20title`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: (c, { eq }) => eq(c.id, courseId),
  });
  if (!course) redirect("/dashboard?error=Course%20not%20found");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${courseId}?error=Not%20authorized`);
  }

  const last = await db
    .select({ order: modules.order })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(modules).values({
    id: crypto.randomUUID(),
    courseId,
    title,
    order: nextOrder,
  });

  redirect(`/courses/${courseId}?tab=modules`);
}

export async function createSectionAction(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  const moduleId = (formData.get("moduleId") as string | null)?.trim();
  if (!title || !moduleId) {
    redirect(`/dashboard?error=Missing%20module%20or%20title`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const moduleRow = await db
    .select({ courseId: modules.courseId, instructorId: courses.instructorId })
    .from(modules)
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(modules.id, moduleId))
    .limit(1);

  const mod = moduleRow[0];
  if (!mod?.courseId) redirect("/dashboard?error=Module%20not%20found");

  const isOwner = user.role === "instructor" && user.id === mod.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${mod.courseId}?error=Not%20authorized`);
  }

  const last = await db
    .select({ order: sections.order })
    .from(sections)
    .where(eq(sections.moduleId, moduleId))
    .orderBy(desc(sections.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(sections).values({
    id: crypto.randomUUID(),
    moduleId,
    title,
    order: nextOrder,
  });

  redirect(`/courses/${mod.courseId}?tab=modules`);
}

export async function updateModuleAction(formData: FormData) {
  const moduleId = (formData.get("moduleId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const orderRaw = (formData.get("order") as string | null)?.trim();
  const newOrder = orderRaw ? Number(orderRaw) : undefined;

  if (!moduleId || !title) {
    redirect("/courses/modules?error=Missing%20module%20or%20title");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const moduleRow = await db
    .select({
      moduleId: modules.id,
      courseId: modules.courseId,
      instructorId: courses.instructorId,
    })
    .from(modules)
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(modules.id, moduleId))
    .limit(1);

  const module = moduleRow[0];
  if (!module || !module.courseId) {
    redirect("/courses/modules?error=Module%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === module.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect("/courses/modules?error=Not%20authorized");
  }

  await db
    .update(modules)
    .set({
      title,
      ...(typeof newOrder === "number" && !Number.isNaN(newOrder) ? { order: newOrder } : {}),
    })
    .where(eq(modules.id, moduleId));

  redirect("/courses/modules?notice=Module%20updated");
}

export async function deleteModuleAction(formData: FormData) {
  const moduleId = (formData.get("moduleId") as string | null)?.trim();
  if (!moduleId) {
    redirect("/courses/modules?error=Missing%20module");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const moduleRow = await db
    .select({
      moduleId: modules.id,
      courseId: modules.courseId,
      instructorId: courses.instructorId,
    })
    .from(modules)
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(modules.id, moduleId))
    .limit(1);

  const module = moduleRow[0];
  if (!module || !module.courseId) {
    redirect("/courses/modules?error=Module%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === module.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect("/courses/modules?error=Not%20authorized");
  }

  await db.delete(modules).where(eq(modules.id, moduleId));
  redirect("/courses/modules?notice=Module%20deleted");
}

async function updateReadActivityContent(
  formData: FormData,
  expectedFileType: "html" | "markdown",
  notFoundMsg: string,
) {
  const activityId = (formData.get("activityId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const content = formData.get("content") as string | null;
  const redirectTo = (formData.get("redirectTo") as string | null)?.trim();

  if (!activityId || !title || content === null) {
    redirect("/dashboard?error=Missing%20fields");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: activities.id,
      type: activities.type,
      contentPayload: activities.contentPayload,
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
  if (!item || !item.courseId) {
    redirect("/dashboard?error=Activity%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${item.courseId}?error=Not%20authorized`);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = item.contentPayload ? JSON.parse(item.contentPayload) : {};
  } catch {
    payload = {};
  }
  if (item.type !== "read" || payload.fileType !== expectedFileType) {
    redirect(`/courses/${item.courseId}?error=${encodeURIComponent(notFoundMsg)}`);
  }

  await db
    .update(activities)
    .set({ title, content: content! })
    .where(eq(activities.id, activityId));

  redirect(redirectTo || `/courses/${item.courseId}?tab=modules&notice=Activity%20updated`);
}

export async function updateReadHtmlActivityAction(formData: FormData) {
  await updateReadActivityContent(formData, "html", "Not an HTML Read activity");
}

export async function updateReadMarkdownActivityAction(formData: FormData) {
  await updateReadActivityContent(formData, "markdown", "Not a Markdown Read activity");
}

const WATCH_NOTES_MIN = 100;
const WATCH_NOTES_MAX = 2000;

export async function saveWatchNotesAndCompleteAction(formData: FormData) {
  const activityId = (formData.get("activityId") as string | null)?.trim();
  const notes = ((formData.get("notes") as string | null) ?? "").trim();
  if (!activityId) redirect("/dashboard?error=Missing%20activity");

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: activities.id,
      type: activities.type,
      courseId: courses.id,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(activities.id, activityId))
    .limit(1);

  const item = itemRow[0];
  if (!item || !item.courseId) {
    redirect("/dashboard?error=Activity%20not%20found");
  }

  const back = `/courses/${item.courseId}/activities/${activityId}`;

  if (item.type !== "watch") {
    redirect(`${back}?error=Notes%20only%20available%20on%20Watch%20activities`);
  }
  if (user.role !== "learner") {
    redirect(`${back}?error=Only%20learners%20can%20save%20notes`);
  }

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) =>
      and(eq(e.courseId, item.courseId as string), eq(e.userId, user.id)),
  });
  if (!enrollment) redirect(`/courses/${item.courseId}?error=Not%20enrolled`);

  const alreadyComplete = await db.query.completions.findFirst({
    columns: { id: true },
    where: (c, { and, eq }) => and(eq(c.activityId, activityId), eq(c.userId, user.id)),
  });
  if (alreadyComplete) {
    redirect(`${back}?error=Already%20marked%20complete`);
  }

  if (notes.length < WATCH_NOTES_MIN) {
    redirect(`${back}?error=Notes%20must%20be%20at%20least%20${WATCH_NOTES_MIN}%20characters`);
  }
  if (notes.length > WATCH_NOTES_MAX) {
    redirect(`${back}?error=Notes%20exceed%20${WATCH_NOTES_MAX}%20character%20limit`);
  }

  const now = new Date();

  const existingNote = await db.query.activityNotes.findFirst({
    columns: { id: true },
    where: (n, { and, eq }) => and(eq(n.activityId, activityId), eq(n.userId, user.id)),
  });
  if (existingNote) {
    await db
      .update(activityNotes)
      .set({ notes, updatedAt: now })
      .where(eq(activityNotes.id, existingNote.id));
  } else {
    await db.insert(activityNotes).values({
      id: crypto.randomUUID(),
      activityId,
      userId: user.id,
      notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(completions).values({
    id: crypto.randomUUID(),
    activityId,
    userId: user.id,
    completedAt: now,
  });

  redirect(`${back}?notice=Video%20marked%20complete`);
}

export async function updateWatchActivityTranscriptAction(formData: FormData) {
  const activityId = (formData.get("activityId") as string | null)?.trim();
  const transcript = ((formData.get("transcript") as string | null) ?? "").trim();
  const redirectTo = (formData.get("redirectTo") as string | null)?.trim();

  if (!activityId) {
    redirect("/dashboard?error=Missing%20activity");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: activities.id,
      type: activities.type,
      contentPayload: activities.contentPayload,
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
  if (!item || !item.courseId) {
    redirect("/dashboard?error=Activity%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${item.courseId}?error=Not%20authorized`);
  }

  if (item.type !== "watch") {
    redirect(`/courses/${item.courseId}?error=Not%20a%20Watch%20activity`);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = item.contentPayload ? JSON.parse(item.contentPayload) : {};
  } catch {
    payload = {};
  }

  const next = { ...payload, transcript };
  await db
    .update(activities)
    .set({ contentPayload: JSON.stringify(next) })
    .where(eq(activities.id, activityId));

  redirect(redirectTo || `/courses/${item.courseId}?tab=modules&notice=Transcript%20saved`);
}

export async function deleteActivityAction(formData: FormData) {
  const activityId = (formData.get("activityId") as string | null)?.trim();
  if (!activityId) {
    redirect("/courses/content?error=Missing%20activity");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: activities.id,
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
  if (!item || !item.courseId) {
    redirect("/courses/content?error=Activity%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect("/courses/content?error=Not%20authorized");
  }

  await db.delete(activities).where(eq(activities.id, activityId));
  redirect(`/courses/${item.courseId}?tab=modules&notice=Activity%20deleted`);
}

// ─── Activity creation actions ────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  }
  return null;
}

async function getSectionCourseOrRedirect(
  sectionId: string,
  userId: string,
  userRole: string,
  fallbackRedirect: string
) {
  const db = await getDb();
  const rows = await db
    .select({ courseId: courses.id, instructorId: courses.instructorId })
    .from(sections)
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(sections.id, sectionId))
    .limit(1);
  const sec = rows[0];
  if (!sec?.courseId) redirect(fallbackRedirect + "?error=Section%20not%20found");
  const isOwner = userRole === "instructor" && userId === sec.instructorId;
  const isAdmin = userRole === "admin";
  if (!isOwner && !isAdmin) redirect(`/courses/${sec.courseId}?error=Not%20authorized`);
  return { db, courseId: sec.courseId! };
}

async function nextActivityOrder(db: Awaited<ReturnType<typeof getDb>>, sectionId: string) {
  const last = await db
    .select({ order: activities.order })
    .from(activities)
    .where(eq(activities.sectionId, sectionId))
    .orderBy(desc(activities.order))
    .limit(1);
  return (last[0]?.order ?? 0) + 1;
}

export async function createWatchActivityAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const youtubeUrl = (formData.get("youtubeUrl") as string | null)?.trim();

  if (!sectionId || !title || !youtubeUrl) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) {
    redirect(`/dashboard?error=Invalid%20YouTube%20URL`);
  }

  const { db, courseId } = await getSectionCourseOrRedirect(sectionId, user.id, user.role, "/dashboard");
  const order = await nextActivityOrder(db, sectionId);

  await db.insert(activities).values({
    id: crypto.randomUUID(),
    sectionId,
    type: "watch",
    title,
    content: youtubeUrl,
    contentPayload: JSON.stringify({ youtubeUrl, youtubeId }),
    order,
  });

  redirect(`/courses/${courseId}?tab=modules`);
}

export async function uploadListenActivityAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!sectionId || !title || !file || file.size === 0) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  const ALLOWED_AUDIO = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/ogg", "audio/webm"];
  if (!ALLOWED_AUDIO.includes(file.type)) {
    redirect("/dashboard?error=File%20must%20be%20an%20audio%20file%20(MP3%2C%20M4A%2C%20WAV%2C%20OGG)");
  }

  const MAX_BYTES = 100 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    redirect("/dashboard?error=Audio%20file%20must%20be%20under%20100MB");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { db, courseId } = await getSectionCourseOrRedirect(sectionId, user.id, user.role, "/dashboard");

  const ext = file.name.split(".").pop() || "mp3";
  const key = `${courseId}/${sectionId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const audioUrl = await uploadFileToR2(buffer, key, file.type);

  const order = await nextActivityOrder(db, sectionId);

  await db.insert(activities).values({
    id: crypto.randomUUID(),
    sectionId,
    type: "listen",
    title,
    content: audioUrl,
    contentPayload: JSON.stringify({ audioUrl }),
    order,
  });

  redirect(`/courses/${courseId}?tab=modules`);
}

export async function createReadActivityAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!sectionId || !title || !file || file.size === 0) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  const MAX_BYTES = 20 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    redirect("/dashboard?error=File%20must%20be%20under%2020MB");
  }

  const isPdf = file.type === "application/pdf";
  const isMd =
    file.type === "text/markdown" ||
    file.type === "text/plain" ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".markdown");

  if (!isPdf && !isMd) {
    redirect("/dashboard?error=File%20must%20be%20a%20PDF%20or%20Markdown%20(.md)%20file");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { db, courseId } = await getSectionCourseOrRedirect(sectionId, user.id, user.role, "/dashboard");
  const order = await nextActivityOrder(db, sectionId);

  if (isPdf) {
    const key = `${courseId}/${sectionId}/${crypto.randomUUID()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadPdfToR2(buffer, key);

    await db.insert(activities).values({
      id: crypto.randomUUID(),
      sectionId,
      type: "read",
      title,
      content: fileUrl,
      contentPayload: JSON.stringify({ fileType: "pdf", fileUrl }),
      order,
    });
  } else {
    const mdText = await file.text();
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      sectionId,
      type: "read",
      title,
      content: mdText,
      contentPayload: JSON.stringify({ fileType: "markdown" }),
      order,
    });
  }

  redirect(`/courses/${courseId}?tab=modules`);
}

export async function createWriteActivityAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const prompt = (formData.get("prompt") as string | null)?.trim();
  const minCharsRaw = (formData.get("minChars") as string | null)?.trim();
  const maxCharsRaw = (formData.get("maxChars") as string | null)?.trim();

  if (!sectionId || !title || !prompt) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  const minChars = minCharsRaw ? parseInt(minCharsRaw, 10) : null;
  const maxChars = maxCharsRaw ? parseInt(maxCharsRaw, 10) : null;

  if (minChars !== null && Number.isNaN(minChars)) redirect("/dashboard?error=Invalid%20min%20characters");
  if (maxChars !== null && Number.isNaN(maxChars)) redirect("/dashboard?error=Invalid%20max%20characters");
  if (minChars !== null && maxChars !== null && minChars > maxChars) {
    redirect("/dashboard?error=Min%20characters%20cannot%20exceed%20max");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { db, courseId } = await getSectionCourseOrRedirect(sectionId, user.id, user.role, "/dashboard");
  const order = await nextActivityOrder(db, sectionId);

  const activityId = crypto.randomUUID();

  await db.insert(activities).values({
    id: activityId,
    sectionId,
    type: "write",
    title,
    content: prompt,
    contentPayload: JSON.stringify({ prompt, minChars, maxChars }),
    order,
  });

  // Auto-create the built-in open_ended assessment that captures the student response.
  // The first open_ended assessment on a Write activity is the canonical submission target.
  await db.insert(assessments).values({
    id: crypto.randomUUID(),
    activityId,
    type: "open_ended",
    title,
    description: prompt,
    graded: false,
    order: 1,
  });

  redirect(`/courses/${courseId}?tab=modules`);
}

export async function submitWriteActivityAction(formData: FormData) {
  const activityId = (formData.get("activityId") as string | null)?.trim();
  const submissionText = ((formData.get("submissionText") as string | null) || "").trim();
  const courseId = (formData.get("courseId") as string | null)?.trim();

  if (!activityId || !courseId) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role !== "learner") {
    redirect("/dashboard?error=Only%20learners%20can%20submit");
  }

  const db = await getDb();

  const activity = await db.query.activities.findFirst({
    columns: { id: true, contentPayload: true },
    where: (a, { eq }) => eq(a.id, activityId),
  });

  if (!activity) redirect(`/courses/${courseId}?error=Activity%20not%20found`);

  const payload = activity.contentPayload ? JSON.parse(activity.contentPayload) : {};
  const minChars: number | null = payload.minChars ?? null;
  const maxChars: number | null = payload.maxChars ?? null;

  if (minChars !== null && submissionText.length < minChars) {
    redirect(`/courses/${courseId}/activities/${activityId}?error=Response%20must%20be%20at%20least%20${minChars}%20characters`);
  }
  if (maxChars !== null && submissionText.length > maxChars) {
    redirect(`/courses/${courseId}/activities/${activityId}?error=Response%20must%20be%20at%20most%20${maxChars}%20characters`);
  }

  // The Write activity's built-in submission target is the first open_ended assessment.
  const assessmentRow = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(eq(assessments.activityId, activityId))
    .orderBy(asc(assessments.order))
    .limit(1);

  if (!assessmentRow[0]) {
    redirect(`/courses/${courseId}/activities/${activityId}?error=Built-in%20assessment%20missing`);
  }
  const assessmentId = assessmentRow[0].id;

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
  });
  if (!enrollment) redirect(`/courses/${courseId}?error=Not%20enrolled`);

  const now = new Date();
  await db
    .insert(submissions)
    .values({
      id: crypto.randomUUID(),
      assessmentId,
      userId: user.id,
      submissionText: submissionText || null,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [submissions.assessmentId, submissions.userId],
      set: { submissionText: submissionText || null, submittedAt: now },
    });

  await db
    .insert(completions)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      activityId,
    })
    .onConflictDoNothing();

  redirect(`/courses/${courseId}/activities/${activityId}?notice=Response%20saved`);
}
