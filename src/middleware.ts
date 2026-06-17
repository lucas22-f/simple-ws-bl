import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess, type AuthProfile } from "@/server/auth/guards";

export function requirePublicSupabaseEnv(env: Record<string, string | undefined> = process.env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Invalid server configuration: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { supabaseUrl, supabasePublishableKey };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = requirePublicSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: AuthProfile = null;

  if (user) {
    const { data } = await supabase.from("profiles").select("id, role, admin_status").eq("id", user.id).maybeSingle();
    profile = data as AuthProfile;
  }

  const decision = resolveAdminAccess(profile, request.url);

  if (!decision.allowed) {
    return NextResponse.redirect(decision.redirectTo);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

