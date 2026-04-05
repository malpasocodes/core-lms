"use server";

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { uploadFileToR2, uploadPdfToR2 } from "@/lib/r2";
import { assignments, contentItems, courses, modules, sections } from "@/lib/schema";

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

export async function createContentItemAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim();

  if (!sectionId || !title || !type || !content) {
    redirect(`/dashboard?error=Missing%20content%20fields`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const sectionRow = await db
    .select({
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(sections)
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(sections.id, sectionId))
    .limit(1);

  const sec = sectionRow[0];
  if (!sec?.courseId) redirect("/dashboard?error=Section%20not%20found");

  const isOwner = user.role === "instructor" && user.id === sec.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${sec.courseId}?error=Not%20authorized`);
  }

  if (type !== "page" && type !== "link" && type !== "markdown") {
    redirect(`/courses/${sec.courseId}?error=Invalid%20content%20type`);
  }

  const last = await db
    .select({ order: contentItems.order })
    .from(contentItems)
    .where(eq(contentItems.sectionId, sectionId))
    .orderBy(desc(contentItems.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(contentItems).values({
    id: crypto.randomUUID(),
    sectionId,
    title,
    type,
    content,
    order: nextOrder,
  });

  redirect(`/courses/${sec.courseId}`);
}

export async function uploadPdfContentItemAction(formData: FormData) {
  const sectionId = (formData.get("sectionId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!sectionId || !title || !file || file.size === 0) {
    redirect("/dashboard?error=Missing%20required%20fields");
  }

  if (file.type !== "application/pdf") {
    redirect("/dashboard?error=File%20must%20be%20a%20PDF");
  }

  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_BYTES) {
    redirect("/dashboard?error=PDF%20must%20be%20under%2020MB");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const sectionRow = await db
    .select({ courseId: courses.id, instructorId: courses.instructorId })
    .from(sections)
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(sections.id, sectionId))
    .limit(1);

  const sec = sectionRow[0];
  if (!sec?.courseId) redirect("/dashboard?error=Section%20not%20found");

  const isOwner = user.role === "instructor" && user.id === sec.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${sec.courseId}?error=Not%20authorized`);
  }

  const key = `${sec.courseId}/${sectionId}/${crypto.randomUUID()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadPdfToR2(buffer, key);

  const last = await db
    .select({ order: contentItems.order })
    .from(contentItems)
    .where(eq(contentItems.sectionId, sectionId))
    .orderBy(desc(contentItems.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(contentItems).values({
    id: crypto.randomUUID(),
    sectionId,
    type: "pdf",
    title,
    content: publicUrl,
    order: nextOrder,
  });

  redirect(`/courses/${sec.courseId}?tab=modules`);
}

export async function updateContentItemAction(formData: FormData) {
  const itemId = (formData.get("itemId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim();
  const redirectTo = (formData.get("redirectTo") as string | null)?.trim();

  if (!itemId || !title || !type || !content) {
    redirect("/courses/content?error=Missing%20fields");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: contentItems.id,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(contentItems)
    .leftJoin(sections, eq(contentItems.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(contentItems.id, itemId))
    .limit(1);

  const item = itemRow[0];
  if (!item || !item.courseId) {
    redirect("/courses/content?error=Content%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect("/courses/content?error=Not%20authorized");
  }

  if (type !== "page" && type !== "link" && type !== "markdown") {
    redirect("/courses/content?error=Invalid%20type");
  }

  await db
    .update(contentItems)
    .set({
      title,
      type,
      content,
    })
    .where(eq(contentItems.id, itemId));

  redirect(redirectTo || "/courses/content?notice=Content%20updated");
}

export async function deleteContentItemAction(formData: FormData) {
  const itemId = (formData.get("itemId") as string | null)?.trim();
  if (!itemId) {
    redirect("/courses/content?error=Missing%20content%20item");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      id: contentItems.id,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(contentItems)
    .leftJoin(sections, eq(contentItems.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(contentItems.id, itemId))
    .limit(1);

  const item = itemRow[0];
  if (!item || !item.courseId) {
    redirect("/courses/content?error=Content%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect("/courses/content?error=Not%20authorized");
  }

  await db.delete(contentItems).where(eq(contentItems.id, itemId));
  redirect("/courses/content?notice=Content%20deleted");
}

// ─── Activity creation actions ────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // Handle /embed/ and /shorts/ URLs
      const parts = u.pathname.split("/");
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // not a URL — treat as raw video ID
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

async function nextItemOrder(db: Awaited<ReturnType<typeof getDb>>, sectionId: string) {
  const last = await db
    .select({ order: contentItems.order })
    .from(contentItems)
    .where(eq(contentItems.sectionId, sectionId))
    .orderBy(desc(contentItems.order))
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
  const order = await nextItemOrder(db, sectionId);

  await db.insert(contentItems).values({
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

  const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
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

  const order = await nextItemOrder(db, sectionId);

  await db.insert(contentItems).values({
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

  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
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
  const order = await nextItemOrder(db, sectionId);

  if (isPdf) {
    const key = `${courseId}/${sectionId}/${crypto.randomUUID()}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadPdfToR2(buffer, key);

    await db.insert(contentItems).values({
      id: crypto.randomUUID(),
      sectionId,
      type: "read",
      title,
      content: fileUrl,
      contentPayload: JSON.stringify({ fileType: "pdf", fileUrl }),
      order,
    });
  } else {
    // Markdown — read as text, store inline
    const mdText = await file.text();
    await db.insert(contentItems).values({
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
  const order = await nextItemOrder(db, sectionId);

  const activityId = crypto.randomUUID();

  await db.insert(contentItems).values({
    id: activityId,
    sectionId,
    type: "write",
    title,
    content: prompt,
    contentPayload: JSON.stringify({ prompt, minChars, maxChars }),
    order,
  });

  // Auto-create linked assignment for submission/grading
  const sectionRow = await db
    .select({ moduleId: sections.moduleId })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);

  await db.insert(assignments).values({
    id: crypto.randomUUID(),
    courseId,
    sectionId,
    title,
    description: prompt,
    type: "open_ended",
    linkedActivityId: activityId,
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

  // Validate character limits from activity payload
  const activity = await db.query.contentItems.findFirst({
    columns: { id: true, contentPayload: true },
    where: (ci, { eq }) => eq(ci.id, activityId),
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

  // Find the linked assignment
  const assignmentRow = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.linkedActivityId, activityId))
    .limit(1);

  if (!assignmentRow[0]) redirect(`/courses/${courseId}/activities/${activityId}?error=Assignment%20not%20found`);

  const assignmentId = assignmentRow[0].id;

  // Ensure user is enrolled
  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
  });
  if (!enrollment) redirect(`/courses/${courseId}?error=Not%20enrolled`);

  const { submissions } = await import("@/lib/schema");
  const now = new Date();
  await db
    .insert(submissions)
    .values({
      id: crypto.randomUUID(),
      assignmentId,
      userId: user.id,
      submissionText: submissionText || null,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.userId],
      set: { submissionText: submissionText || null, submittedAt: now },
    });

  redirect(`/courses/${courseId}/activities/${activityId}?notice=Response%20saved`);
}
