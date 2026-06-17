"use client";

import * as React from "react";
import { useActionState } from "react";
import { PencilLine, Plus, Tags, Trash2, X } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import type { Category } from "@/server/categories/types";

type CategoryFormAction = string | ((state: FormActionState, formData: FormData) => Promise<FormActionState>);

type AdminCategoriesViewProps = {
  categories: Category[];
  actions: {
    create: CategoryFormAction;
    update: CategoryFormAction;
    delete: CategoryFormAction;
  };
};

const fieldClassName =
  "min-h-10 rounded-xl border bg-card px-3 py-1.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";
const compactFieldClassName = `${fieldClassName} max-w-[18rem]`;

function useCategoryFormAction(action: CategoryFormAction) {
  const isEnhancedAction = typeof action === "function";
  const [state, enhancedFormAction] = useActionState(
    isEnhancedAction ? action : async () => initialFormActionState,
    initialFormActionState,
  );

  return {
    formAction: isEnhancedAction ? enhancedFormAction : action,
    state: isEnhancedAction ? state : initialFormActionState,
  };
}

function CategoryActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
          : "inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function CategoryFields({ category }: { category?: Category }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-medium">
        Nombre
        <input
          className={compactFieldClassName}
          name="name"
          placeholder="Ej: Mates"
          defaultValue={category?.name}
          required
          minLength={2}
        />
        <FieldMessage id="cat-name-help" message="Mínimo 2 caracteres." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Slug
        <input
          className={compactFieldClassName}
          name="slug"
          placeholder="Ej: mates"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={category?.slug}
          required
        />
        <FieldMessage id="cat-slug-help" message="Formato: solo minúsculas, guiones y números." />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Descripción
        <textarea
          className={`${fieldClassName} min-h-16 resize-y`}
          name="description"
          placeholder="Descripción opcional"
          defaultValue={category?.description ?? ""}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          name="active"
          type="checkbox"
          value="true"
          defaultChecked={category?.active ?? true}
          className="h-4 w-4 accent-primary"
        />
        Activa
      </label>
    </>
  );
}

function CreateCategoryForm({ action }: { action: CategoryFormAction }) {
  const { state, formAction } = useCategoryFormAction(action);

  return (
    <form action={formAction} className="relative mt-3 grid gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
      <FormToast state={state} successTitle="Categoría creada" />
      <FormLoadingOverlay title="Creando categoría" description="Guardamos la nueva categoría." />
      <CategoryFields />
      <SubmitButton className="button-lift min-h-10 sm:col-span-2" pendingLabel="Guardando categoría...">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Crear categoría
      </SubmitButton>
    </form>
  );
}

function UpdateCategoryForm({ category, action }: { category: Category; action: CategoryFormAction }) {
  const { state, formAction } = useCategoryFormAction(action);

  return (
    <form action={formAction} className="relative mt-3 grid gap-3 overflow-hidden sm:grid-cols-2">
      <FormToast state={state} successTitle="Categoría actualizada" />
      <FormLoadingOverlay title="Actualizando categoría" description="Guardamos los cambios." />
      <input name="categoryId" type="hidden" value={category.id} />
      <CategoryFields category={category} />
      <SubmitButton className="button-lift min-h-10 sm:col-span-2" pendingLabel="Actualizando categoría...">
        <PencilLine className="h-4 w-4" aria-hidden="true" />
        Actualizar categoría
      </SubmitButton>
    </form>
  );
}

function CategoryDeleteForm({ category, action }: { category: Category; action: CategoryFormAction }) {
  const { state, formAction } = useCategoryFormAction(action);
  const isVarios = category.slug === "varios";

  if (isVarios) {
    return (
      <div className="mt-3 rounded-xl border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
        Categoría por defecto — no se puede eliminar
      </div>
    );
  }

  return (
    <form action={formAction} className="relative mt-3 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <FormToast state={state} successTitle="Categoría eliminada" />
      <FormLoadingOverlay title="Eliminando categoría" description="Validamos que no tenga productos asociados." />
      <input name="categoryId" type="hidden" value={category.id} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input className="mt-0.5 h-4 w-4 accent-primary" name="confirmDelete" type="checkbox" value="true" required />
        Confirmo que quiero eliminar &ldquo;{category.name}&rdquo;.
      </label>
      <SubmitButton
        variant="outline"
        aria-label={`Eliminar ${category.name}`}
        className="button-lift mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
        pendingLabel="Eliminando categoría..."
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Eliminar categoría
      </SubmitButton>
    </form>
  );
}

function CategoryEditDialog({ category, actions }: { category: Category; actions: AdminCategoriesViewProps["actions"] }) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        className="w-full px-2 text-xs sm:px-4 sm:text-sm"
        type="button"
        variant="outline"
        aria-label={`Editar ${category.name}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        <PencilLine className="h-4 w-4" aria-hidden="true" />
        Editar
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`edit-category-${category.id}`}
        className="m-auto max-h-[calc(100vh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-0 text-foreground shadow-[0_18px_48px_rgb(37_26_18/0.24)] backdrop:bg-foreground/45"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Editar categoría</p>
            <h2 id={`edit-category-${category.id}`} className="mt-1 text-xl font-semibold">
              {category.name}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Cerrar edición de ${category.name}`}
            onClick={() => dialogRef.current?.close()}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <UpdateCategoryForm category={category} action={actions.update} />
          <CategoryDeleteForm category={category} action={actions.delete} />
        </div>
      </dialog>
    </>
  );
}

export function AdminCategoriesView({ categories, actions }: AdminCategoriesViewProps) {
  return (
    <AdminShell title="Categorías" description="Administrá las categorías de productos.">
      <section className="animate-in-up rounded-xl border border-border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)]">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          Nueva categoría
        </h2>
        <CreateCategoryForm action={actions.create} />
      </section>

      <section className="mt-6" aria-label="Lista de categorías">
        {categories.length === 0 ? (
          <div className="animate-in-up rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Todavía no hay categorías.</p>
            <p>Creá la primera usando el formulario de arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-3">
            {categories.map((category) => (
              <article
                key={category.id}
                aria-label={`Categoría ${category.name}`}
                className="group animate-in-up overflow-hidden rounded-xl border border-border bg-card shadow-[0_2px_8px_rgb(37_26_18/0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)]"
              >
                <div className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <h3 className="truncate text-sm font-semibold sm:text-base">{category.name}</h3>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">/{category.slug}</p>
                    </div>
                    <CategoryActiveBadge active={category.active} />
                  </div>

                  {category.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2 border-t pt-3">
                    <CategoryEditDialog category={category} actions={actions} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
