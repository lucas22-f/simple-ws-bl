"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

type NavigationLinkProps = React.ComponentProps<typeof Link> & {
  pendingTitle?: string;
  pendingDescription?: string;
};

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function shouldShowNavigationOverlay(href: NavigationLinkProps["href"], pathname: string | null) {
  if (typeof href !== "string") {
    return true;
  }

  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (pathname && normalizePath(href) === normalizePath(pathname)) {
    return false;
  }

  return true;
}

export function NavigationLink({
  children,
  onNavigate,
  pendingTitle = "Cargando",
  pendingDescription = "Preparamos la próxima pantalla.",
  href,
  ...props
}: NavigationLinkProps) {
  const [pending, setPending] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setPending(false);
  }, [pathname, searchParams]);

  React.useEffect(() => {
    if (!pending) {
      return;
    }

    const timeout = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return (
    <>
      <Link
        href={href}
        onNavigate={(event) => {
          onNavigate?.(event);
          if (shouldShowNavigationOverlay(href, pathname)) {
            setPending(true);
          }
        }}
        {...props}
      >
        {children}
      </Link>
      {mounted
        ? createPortal(
            <LoadingOverlay
              show={pending}
              title={pendingTitle}
              description={pendingDescription}
              className="fixed rounded-none z-50"
            />,
            document.body,
          )
        : null}
    </>
  );
}
