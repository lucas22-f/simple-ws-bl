"use client";

import * as React from "react";
import { useActionState } from "react";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import { registerAdminAction } from "@/server/admin/actions/register";

type AdminRegisterFormProps = {
  nextPath: string;
  initialState?: FormActionState;
};

function buildAdminLoginHref(nextPath: string) {
  return `/admin/login?next=${encodeURIComponent(nextPath)}`;
}

export function AdminRegisterForm({ nextPath, initialState = initialFormActionState }: AdminRegisterFormProps) {
  const [state, formAction] = useActionState(registerAdminAction, initialState);
  const hasEmailError = Boolean(state.fieldErrors?.email?.trim());
  const hasPasswordError = Boolean(state.fieldErrors?.password?.trim());
  const hasSecretError = Boolean(state.fieldErrors?.secret?.trim());

  return (
    <form action={formAction} className="relative space-y-4 overflow-hidden rounded-3xl border bg-white p-6 shadow-sm animate-in-up">
      <FormToast state={state} errorTitle="We could not create the account" />
      <FormLoadingOverlay title="Creating account" description="We are validating the secret and preparing dashboard access." />
      <input name="next" type="hidden" value={nextPath} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</p>
        <h1 className="text-2xl font-bold text-stone-950">Create admin account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use the team private secret to enable the first admin access.
        </p>
      </div>
      <label className="block text-sm font-medium">
        Email
        <input
          aria-describedby="admin-register-email-help"
          aria-invalid={hasEmailError ? true : undefined}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          name="email"
          type="email"
          required
        />
        <FieldMessage
          id="admin-register-email-help"
          message={state.fieldErrors?.email?.trim() || "Use the email you will use to manage the store."}
          tone={hasEmailError ? "error" : "neutral"}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          aria-describedby="admin-register-password-help"
          aria-invalid={hasPasswordError ? true : undefined}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          name="password"
          type="password"
          required
        />
        <FieldMessage
          id="admin-register-password-help"
          message={state.fieldErrors?.password?.trim() || "Choose a strong password and do not share it outside the team."}
          tone={hasPasswordError ? "error" : "neutral"}
        />
      </label>
      <label className="block text-sm font-medium">
        Registration secret
        <input
          aria-describedby="admin-register-secret-help"
          aria-invalid={hasSecretError ? true : undefined}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          name="secret"
          type="password"
          required
        />
        <FieldMessage
          id="admin-register-secret-help"
          message={state.fieldErrors?.secret?.trim() || "Ask the technical owner for this secret. Never store it in the browser."}
          tone={hasSecretError ? "error" : "neutral"}
        />
      </label>
      <SubmitButton className="button-lift w-full" pendingLabel="Creating account...">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have access?{" "}
        <a
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={buildAdminLoginHref(nextPath)}
        >
          I already have an admin account
        </a>
      </p>
    </form>
  );
}
