import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { uploadFileToR2 } from "@/lib/r2";
import { activities, courses, modules, sections } from "@/lib/schema";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const activityId = (formData.get("activityId") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!activityId || !file || file.size === 0) {
    return NextResponse.json({ error: "Missing activityId or file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "File must be PNG or JPEG" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const db = await getDb();
  const itemRow = await db
    .select({
      id: activities.id,
      sectionId: activities.sectionId,
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
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `${item.courseId}/${item.sectionId}/${activityId}/images/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFileToR2(buffer, key, file.type);

  return NextResponse.json({ url });
}
