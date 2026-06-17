import * as React from "react";
import { revalidatePath } from "next/cache";
import { AdminCategoriesView } from "@/app/admin/categories/category-management";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { listAdminCategories } from "@/server/categories/queries";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/server/categories/actions";

export const dynamic = "force-dynamic";

async function saveCategory(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const rawInput: Record<string, unknown> = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      active: formData.get("active") === "true",
    };
    await createCategoryAction(rawInput);
    revalidatePath("/admin/categories");
    return actionSuccess("Categoría creada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos crear la categoría."));
  }
}

async function updateCategory(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const categoryId = formData.get("categoryId");
    if (typeof categoryId !== "string") throw new Error("ID de categoría inválido");
    const rawInput: Record<string, unknown> = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      active: formData.get("active") === "true",
    };
    await updateCategoryAction(categoryId, rawInput);
    revalidatePath("/admin/categories");
    return actionSuccess("Categoría actualizada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos actualizar la categoría."));
  }
}

async function deleteCategory(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const categoryId = formData.get("categoryId");
    if (typeof categoryId !== "string") throw new Error("ID de categoría inválido");
    await deleteCategoryAction(categoryId);
    revalidatePath("/admin/categories");
    return actionSuccess("Categoría eliminada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos eliminar la categoría."));
  }
}

const pageActions = {
  create: saveCategory,
  update: updateCategory,
  delete: deleteCategory,
};

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  return <AdminCategoriesView categories={categories} actions={pageActions} />;
}
