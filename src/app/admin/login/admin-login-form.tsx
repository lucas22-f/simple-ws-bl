"use client";

import * as React from "react";
import { useActionState, useMemo, useState } from "react";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState } from "@/lib/form-state";
import { loginAction } from "@/server/admin/actions/login";

type AdminLoginFormProps = {
  nextPath: string;
};

function getEmailMessage(email: string, serverMessage?: string) {
  if (serverMessage?.trim()) return { text: serverMessage, tone: "error" as const };
  if (!email) return { text: "Use the Supabase admin user email.", tone: "neutral" as const };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { text: "That email is not valid yet.", tone: "error" as const };
  return { text: "Email format is valid.", tone: "success" as const };
}

function buildAdminRegisterHref(nextPath: string) {
  return `/admin/register?next=${encodeURIComponent(nextPath)}`;
}

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialFormActionState);
  const [email, setEmail] = useState("");
  const emailMessage = useMemo(() => getEmailMessage(email, state.fieldErrors?.email), [email, state.fieldErrors?.email]);

  return (
    <form action={formAction} className="relative space-y-4 overflow-hidden rounded-3xl border bg-white p-6 shadow-sm animate-in-up">
      <FormToast state={state} errorTitle="We could not sign you in" />
      <FormLoadingOverlay title="Signing in" description="We are validating your credentials and preparing the dashboard." />
      <input name="next" type="hidden" value={nextPath} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</p>
        <h1 className="text-2xl font-bold text-stone-950">Sign in</h1>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input
          aria-describedby="admin-login-email-help"
          aria-invalid={state.fieldErrors?.email?.trim() ? true : undefined}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FieldMessage id="admin-login-email-help" message={emailMessage.text} tone={emailMessage.tone} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          aria-describedby="admin-login-password-help"
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          name="password"
          type="password"
          required
        />
        <FieldMessage
          id="admin-login-password-help"
          message={state.fieldErrors?.password?.trim() || "Do not share this password outside the team."}
          tone={state.fieldErrors?.password?.trim() ? "error" : "neutral"}
        />
      </label>
      <SubmitButton className="button-lift w-full" pendingLabel="Signing in...">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Need to enable an owner?{" "}
        <a
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={buildAdminRegisterHref(nextPath)}
        >
          Create admin account
        </a>
      </p>
    </form>
  );
}
