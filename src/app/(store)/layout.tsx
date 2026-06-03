import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function StoreLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-md">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
            aria-label="Ir al inicio de Bazar BL"
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

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/catalog"
            >
              Catálogo
            </Link>
            <Link
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              href="/admin"
            >
              Admin
            </Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
