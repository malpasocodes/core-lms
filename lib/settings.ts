import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/schema";

export type ModelProvider = "anthropic" | "mistral";

export type ModelOption = {
  id: string;
  label: string;
  provider: ModelProvider;
};

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "claude-sonnet-4-6", label: "Anthropic — Claude Sonnet 4.6", provider: "anthropic" },
  { id: "mistral-medium-2505", label: "Mistral — Medium 3", provider: "mistral" },
];

export const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;
export const ACTIVE_MODEL_KEY = "active_model";

export function getModelOption(id: string): ModelOption | undefined {
  return MODEL_OPTIONS.find((m) => m.id === id);
}

export async function getActiveModel(): Promise<ModelOption> {
  const db = await getDb();
  const rows = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, ACTIVE_MODEL_KEY))
    .limit(1);

  const stored = rows[0]?.value;
  return getModelOption(stored ?? "") ?? getModelOption(DEFAULT_MODEL_ID)!;
}
