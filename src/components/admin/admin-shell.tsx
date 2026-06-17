"use client";

import * as React from "react";
import { Home, LogOut, PackageSearch, ReceiptText, Settings, Store, Tags, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { NavigationLink } from "@/components/ui/navigation-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/admin/actions/logout";

type AdminShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
};

const adminNavItems = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/products", label: "Productos", icon: PackageSearch },
  { href: "/admin/orders", label: "Órdenes", icon: ReceiptText },
  { href: "/admin/categories", label: "Categorías", icon: Tags },
  { href: "/admin/approvals", label: "Aprobaciones", icon: Users },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({ title, description, hideHeader, eyebrow = "Admin", children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {!hideHeader && <header className="animate-in-up overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_44px_rgb(37_26_18/0.08)]">
        <div className="flex flex-col gap-5 border-b border-border/70 bg-background/70 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:p-7">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:justify-end" aria-label="Acciones del panel">
            <NavigationLink
              href="/"
              className="button-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              pendingTitle="Cargando tienda"
              pendingDescription="Volvemos a la experiencia pública de compra."
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Ver tienda
            </NavigationLink>
            <form action={logoutAction}>
              <FormLoadingOverlay title="Cerrando sesión" description="Salimos del panel y volvemos al acceso de administración." />
              <SubmitButton
                aria-label="Cerrar sesión de administración"
                className="cursor-pointer button-lift inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-card px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                pendingLabel="Cerrando sesión..."
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Cerrar sesión
              </SubmitButton>
            </form>
          </div>
        </div>

        <nav aria-label="Navegación de administración" className="flex flex-wrap gap-2 bg-card p-3 sm:p-4">
          {adminNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_22px_rgb(164_81_36/0.18)]"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground",
                )}
                pendingTitle="Cargando admin"
                pendingDescription="Abrimos la próxima sección del panel."
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavigationLink>
            );
          })}
        </nav>
      </header>}

      {children}
    </main>
  );
}
