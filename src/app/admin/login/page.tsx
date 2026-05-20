import { createSupabaseServerClient } from "@/server/supabase/server";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email, password });
}

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <form action={login} className="space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</p>
          <h1 className="text-2xl font-bold text-stone-950">Ingresar</h1>
        </div>
        <label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded-xl border px-3 py-2" name="email" type="email" required /></label>
        <label className="block text-sm font-medium">Password<input className="mt-1 w-full rounded-xl border px-3 py-2" name="password" type="password" required /></label>
        <button className="w-full rounded-xl bg-stone-950 px-4 py-2 font-semibold text-white" type="submit">Entrar</button>
      </form>
    </main>
  );
}

