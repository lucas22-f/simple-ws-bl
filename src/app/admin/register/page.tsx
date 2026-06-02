import { NavigationLink } from "@/components/ui/navigation-link";
import { AdminRegisterForm } from "@/app/admin/register/admin-register-form";
import { resolveAdminLoginNextPath } from "@/server/admin/actions/login-path";

type AdminRegisterPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function AdminRegisterPage({ searchParams }: AdminRegisterPageProps) {
  const params = await searchParams;
  const nextPath = resolveAdminLoginNextPath(params?.next);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <NavigationLink
        href="/"
        className="w-fit text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        pendingTitle="Cargando tienda"
        pendingDescription="Volvemos a la experiencia pública de compra."
      >
        Volver a la tienda
      </NavigationLink>

      <AdminRegisterForm nextPath={nextPath} />
    </main>
  );
}
