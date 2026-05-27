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

const supabaseServerClientEnvSchema = publicEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: true,
});

const supabaseAdminEnvSchema = publicEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
}).extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const adminRegistrationEnvSchema = z.object({
  ADMIN_REGISTRATION_SECRET: z.string().trim().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type SupabaseServerClientEnv = z.infer<typeof supabaseServerClientEnvSchema>;
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema>;
export type AdminRegistrationEnv = z.infer<typeof adminRegistrationEnvSchema>;

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

export function createSupabaseServerClientEnv(
  rawEnv: Record<string, string | undefined>,
): SupabaseServerClientEnv {
  const parsed = supabaseServerClientEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid Supabase server configuration: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function createSupabaseAdminEnv(rawEnv: Record<string, string | undefined>): SupabaseAdminEnv {
  const parsed = supabaseAdminEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid Supabase admin configuration: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function createAdminRegistrationEnv(rawEnv: Record<string, string | undefined>): AdminRegistrationEnv {
  const parsed = adminRegistrationEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid admin registration configuration: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}

export function getPublicEnv() {
  return createPublicEnv(process.env);
}

export function getServerEnv() {
  return createServerEnv(process.env);
}

export function getSupabaseServerClientEnv() {
  return createSupabaseServerClientEnv(process.env);
}

export function getSupabaseAdminEnv() {
  return createSupabaseAdminEnv(process.env);
}

export function getAdminRegistrationEnv() {
  return createAdminRegistrationEnv(process.env);
}
