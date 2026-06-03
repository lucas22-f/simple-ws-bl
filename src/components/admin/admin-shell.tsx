"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavigationLink } from "@/components/ui/navigation-link";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
};

const adminNavItems = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/orders", label: "Órdenes" },
  { href: "/admin/settings", label: "Configuración" },
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

export function AdminShell({ title, description, eyebrow = "Admin", children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:py-10">
      <header className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-sm sm:p-6 animate-in-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Acciones del panel">
            <NavigationLink
              href="/"
              className="button-lift inline-flex min-h-10 items-center justify-center rounded-full border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              pendingTitle="Cargando tienda"
              pendingDescription="Volvemos a la experiencia pública de compra."
            >
              Ver tienda
            </NavigationLink>
          </div>
        </div>

        <nav aria-label="Navegación de administración" className="flex flex-wrap gap-2">
          {adminNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <NavigationLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground",
                )}
                pendingTitle="Cargando admin"
                pendingDescription="Abrimos la próxima sección del panel."
              >
                {item.label}
              </NavigationLink>
            );
          })}
        </nav>
      </header>

      {children}
    </main>
  );
}
