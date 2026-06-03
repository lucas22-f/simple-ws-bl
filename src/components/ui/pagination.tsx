import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavigationLink } from "@/components/ui/navigation-link";
import type { PaginationState } from "@/lib/pagination";

type PaginationControlsProps = {
  pagination: PaginationState;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  itemLabel: string;
};

function buildPageHref(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PaginationControls({ pagination, basePath, searchParams = {}, itemLabel }: PaginationControlsProps) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const { page, pageSize, totalItems, totalPages } = pagination;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:flex-row sm:items-center sm:justify-between"
      aria-label={`Paginación de ${itemLabel}`}
    >
      <p className="text-sm text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{firstItem}-{lastItem}</span> de{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <PaginationLink
          href={buildPageHref(basePath, searchParams, previousPage)}
          disabled={page <= 1}
          label="Anterior"
          icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        />
        <span className="rounded-full bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground">
          {page} / {totalPages}
        </span>
        <PaginationLink
          href={buildPageHref(basePath, searchParams, nextPage)}
          disabled={page >= totalPages}
          label="Siguiente"
          icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          iconPosition="end"
        />
      </div>
    </nav>
  );
}

type PaginationLinkProps = {
  href: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
  iconPosition?: "start" | "end";
};

function PaginationLink({ href, disabled, label, icon, iconPosition = "start" }: PaginationLinkProps) {
  const className =
    "button-lift inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (disabled) {
    return (
      <span className={`${className} pointer-events-none opacity-45`} aria-disabled="true">
        {iconPosition === "start" ? icon : null}
        {label}
        {iconPosition === "end" ? icon : null}
      </span>
    );
  }

  return (
    <NavigationLink className={className} href={href} pendingTitle="Cargando página" pendingDescription="Preparamos la siguiente tanda de resultados.">
      {iconPosition === "start" ? icon : null}
      {label}
      {iconPosition === "end" ? icon : null}
    </NavigationLink>
  );
}
