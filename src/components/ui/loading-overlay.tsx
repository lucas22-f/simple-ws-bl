"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-background/82 p-4 text-center backdrop-blur-sm animate-in-fade",
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
    </div>,
    document.body,
  );
}

type FormLoadingOverlayProps = Omit<LoadingOverlayProps, "show">;

export function FormLoadingOverlay(props: FormLoadingOverlayProps) {
  const { pending } = useFormStatus();
  return <LoadingOverlay show={pending} {...props} />;
}
