"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { ACTIVE_MODEL_KEY, getModelOption } from "@/lib/settings";

export async function setActiveModelAction(formData: FormData) {
  await requireAdmin();

  const modelId = (formData.get("modelId") as string | null)?.trim();
  if (!modelId || !getModelOption(modelId)) {
    redirect("/admin/settings?error=Invalid%20model");
  }

  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key: ACTIVE_MODEL_KEY, value: modelId! })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: modelId!, updatedAt: sql`now()` },
    });

  redirect("/admin/settings?notice=Model%20updated");
}
