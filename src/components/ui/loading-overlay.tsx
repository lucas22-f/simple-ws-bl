"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type LoadingOverlayProps = {
  show: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export function LoadingOverlay({
  show,
  title = "Procesando",
  description = "Estamos guardando los cambios. No cierres esta pantalla.",
  className,
}: LoadingOverlayProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 grid place-items-center rounded-[inherit] bg-background/82 p-4 text-center backdrop-blur-sm animate-in-fade",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-card flex max-w-xs flex-col items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-lg">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

type FormLoadingOverlayProps = Omit<LoadingOverlayProps, "show">;

export function FormLoadingOverlay(props: FormLoadingOverlayProps) {
  const { pending } = useFormStatus();
  return <LoadingOverlay show={pending} {...props} />;
}
