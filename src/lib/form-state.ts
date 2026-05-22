export type FormActionStatus = "idle" | "success" | "error";

export type FormActionState = {
  status: FormActionStatus;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialFormActionState: FormActionState = { status: "idle" };

export function actionSuccess(message: string): FormActionState {
  return { status: "success", message };
}

export function actionError(message: string, fieldErrors?: Record<string, string>): FormActionState {
  return { status: "error", message, fieldErrors };
}

export function getErrorMessage(error: unknown, fallback = "No pudimos completar la acción. Probá de nuevo.") {
  return error instanceof Error && error.message ? error.message : fallback;
}