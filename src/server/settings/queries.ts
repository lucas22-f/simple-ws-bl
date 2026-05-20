import "server-only";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type AnalyticsSettings = {
  metaPixelId: string | null;
  gtmId: string | null;
};

type SettingRow = { key: string; value: unknown };

export type PublicSettingsRepository = {
  getPublicSettings(): Promise<SettingRow[]>;
};

export function isValidMetaPixelId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5,20}$/.test(value);
}

export function isValidGtmId(value: unknown): value is string {
  return typeof value === "string" && /^GTM-[A-Z0-9]{4,}$/.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function createSupabasePublicSettingsRepository(): PublicSettingsRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async getPublicSettings() {
      const { data, error } = await supabase.from("settings").select("key,value").eq("is_public", true).in("key", ["analytics"]);
      if (error) throw new Error("No pudimos cargar analytics");
      return (data ?? []) as SettingRow[];
    },
  };
}

export async function getAnalyticsSettings(repository: PublicSettingsRepository = createSupabasePublicSettingsRepository()): Promise<AnalyticsSettings> {
  const rows = await repository.getPublicSettings();
  const analytics = asRecord(rows.find((row) => row.key === "analytics")?.value);
  return {
    metaPixelId: isValidMetaPixelId(analytics.metaPixelId) ? analytics.metaPixelId : null,
    gtmId: isValidGtmId(analytics.gtmId) ? analytics.gtmId : null,
  };
}

