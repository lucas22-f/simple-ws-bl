import "server-only";
import { z } from "zod";
import { assertAdminActionAccess, type AdminActionAuthOptions } from "@/server/admin/actions/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { isValidGtmId, isValidMetaPixelId } from "@/server/settings/queries";

const nullableString = z.union([z.string().trim(), z.literal("")]).optional().transform((value) => value || null);
const analyticsSchema = z.object({
  metaPixelId: nullableString.refine((value) => value === null || isValidMetaPixelId(value), "Meta Pixel inválido"),
  gtmId: nullableString.refine((value) => value === null || isValidGtmId(value), "GTM inválido"),
});

export const adminSettingsSchema = z.object({
  shippingZones: z.array(z.object({
    city: nullableString,
    postalCodePrefix: nullableString,
    costCents: z.coerce.number().int().nonnegative(),
  })).default([]),
  commission: z.object({
    enabled: z.boolean().default(false),
    type: z.enum(["fixed", "percentage"]),
    value: z.coerce.number().nonnegative(),
  }),
  analytics: analyticsSchema,
});

export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;

export type SettingsRepository = {
  upsertSettings(settings: AdminSettingsInput): Promise<unknown>;
};

type SettingsActionOptions = AdminActionAuthOptions & {
  repository?: SettingsRepository;
};

function normalizeRawSettingsInput(rawInput: unknown) {
  if (rawInput instanceof FormData) {
    const city = rawInput.get("shippingZones.0.city");
    const costCents = rawInput.get("shippingZones.0.costCents");
    return {
      shippingZones: costCents ? [{ city, costCents, postalCodePrefix: rawInput.get("shippingZones.0.postalCodePrefix") ?? "" }] : [],
      commission: {
        enabled: true,
        type: rawInput.get("commission.type") ?? "percentage",
        value: rawInput.get("commission.value") ?? 0,
      },
      analytics: {
        metaPixelId: rawInput.get("analytics.metaPixelId") ?? "",
        gtmId: rawInput.get("analytics.gtmId") ?? "",
      },
    };
  }
  return rawInput;
}

export function createSupabaseSettingsRepository(): SettingsRepository {
  const supabase = createSupabaseAdminClient();
  return {
    async upsertSettings(settings) {
      const rows = [
        { key: "shipping_zones", value: settings.shippingZones, is_public: false },
        { key: "commission", value: settings.commission, is_public: false },
        { key: "analytics", value: settings.analytics, is_public: true },
      ];
      const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
      if (error) throw new Error("No pudimos guardar la configuración");
      return settings;
    },
  };
}

export async function updateSettingsAction(rawInput: unknown, options: SettingsActionOptions = {}) {
  await assertAdminActionAccess(options);
  const parsed = adminSettingsSchema.safeParse(normalizeRawSettingsInput(rawInput));
  if (!parsed.success) throw new Error("Configuración inválida");
  const repository = options.repository ?? createSupabaseSettingsRepository();
  return repository.upsertSettings(parsed.data);
}
