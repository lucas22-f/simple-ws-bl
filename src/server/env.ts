import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_SECRET: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvError(error: z.ZodError) {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}

export function createPublicEnv(rawEnv: Record<string, string | undefined>): PublicEnv {
  const parsed = publicEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid public configuration: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function createServerEnv(rawEnv: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid server configuration: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function getPublicEnv() {
  return createPublicEnv(process.env);
}

export function getServerEnv() {
  return createServerEnv(process.env);
}
