"use client";

import * as React from "react";
import type { FormActionState } from "@/lib/form-state";

type FormToastProps = {
  state: FormActionState;
  successTitle?: string;
  errorTitle?: string;
};

export function FormToast({ state, successTitle = "Listo", errorTitle = "Revisá el formulario" }: FormToastProps) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isError = state.status === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={
        isError
          ? "fixed right-4 top-4 z-50 max-w-sm rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg animate-in-up"
          : "fixed right-4 top-4 z-50 max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg animate-in-up"
      }
    >
      <p className="font-semibold">{isError ? errorTitle : successTitle}</p>
      <p className="mt-1 leading-5">{state.message}</p>
    </div>
  );
}

type FieldMessageProps = {
  id: string;
  message?: string;
  tone?: "neutral" | "error" | "success";
};

export function FieldMessage({ id, message, tone = "neutral" }: FieldMessageProps) {
  if (!message) {
    return null;
  }

  const className =
    tone === "error"
      ? "mt-1 text-xs text-red-700 animate-in-fade"
      : tone === "success"
        ? "mt-1 text-xs text-emerald-700 animate-in-fade"
        : "mt-1 text-xs text-muted-foreground animate-in-fade";

  return (
    <p id={id} className={className}>
      {message}
    </p>
  );
}
