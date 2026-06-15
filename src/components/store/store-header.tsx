"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import * as React from "react";
import { CartDrawer } from "@/components/cart";
import { NavigationLink } from "@/components/ui/navigation-link";

const navigationItems = [
  { href: "/catalog", label: "Catálogo" },
  { href: "/admin", label: "Admin" },
];

export function StoreHeader() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          className="inline-flex shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
          aria-label="Ir al inicio de Bazar BL"
          onClick={closeMenu}
        >
          <Image
            className="h-11 w-auto object-contain sm:h-12 lg:h-14"
            src="/brand/bazar-bl-logo-navbar.png"
            alt="Bazar BL"
            width={720}
            height={246}
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {navigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={item.href}
                pendingTitle={item.label === "Admin" ? "Cargando admin" : "Cargando catálogo"}
                pendingDescription={item.label === "Admin" ? "Verificamos el acceso y abrimos el panel." : "Abrimos el catálogo de productos."}
              >
                {item.label}
              </NavigationLink>
            ))}
          </div>
          <CartDrawer />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={open}
            aria-controls="mobile-store-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-store-navigation"
        aria-hidden={!open}
        className={[
          "grid overflow-hidden border-t border-border/70 bg-background shadow-sm transition-[grid-template-rows,opacity,transform] duration-200 ease-out sm:hidden",
          open ? "grid-rows-[1fr] opacity-100 translate-y-0" : "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none",
        ].join(" ")}
      >
        <div className="min-h-0">
          <div className="mx-auto grid max-w-7xl gap-2 px-4 py-3">
            {navigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={item.href}
                onClick={closeMenu}
                pendingTitle={item.label === "Admin" ? "Cargando admin" : "Cargando catálogo"}
                pendingDescription={item.label === "Admin" ? "Verificamos el acceso y abrimos el panel." : "Abrimos el catálogo de productos."}
                tabIndex={open ? undefined : -1}
              >
                {item.label}
              </NavigationLink>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
