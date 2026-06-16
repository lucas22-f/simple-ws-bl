import * as React from "react";
import { revalidatePath } from "next/cache";
import { AdminProductsView } from "@/app/admin/products/product-management";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { parsePageParam } from "@/lib/pagination";
import { archiveProductAction, createProductAction, deleteProductAction, updateProductAction } from "@/server/admin/actions/products";
import { listAdminProductsPage } from "@/server/products/queries";

export const dynamic = "force-dynamic";
const ADMIN_PRODUCTS_PAGE_SIZE = 5;

async function saveProduct(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const product = await createProductAction(formData);
    revalidatePath("/admin/products");
    if (product.imageUploadFailed) {
      return actionSuccess("Producto creado, pero no pudimos adjuntar la imagen. Podés editarlo y volver a intentar.");
    }

    return actionSuccess("Producto creado y catálogo actualizado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos crear el producto."));
  }
}

async function saveProductUpdate(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const productId = formData.get("productId");
    if (typeof productId !== "string") throw new Error("ID de producto invÃ¡lido");
    await updateProductAction(productId, formData);
    revalidatePath("/admin/products");
    return actionSuccess("Producto actualizado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos actualizar el producto."));
  }
}

async function archiveProduct(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const productId = formData.get("productId");
    if (typeof productId !== "string") throw new Error("ID de producto invÃ¡lido");
    await archiveProductAction(productId);
    revalidatePath("/admin/products");
    return actionSuccess("Producto archivado. Ya no aparece en el catÃ¡logo pÃºblico.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos archivar el producto."));
  }
}

async function deleteProduct(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const productId = formData.get("productId");
    if (typeof productId !== "string") throw new Error("ID de producto inválido");
    await deleteProductAction(productId, { confirmedDelete: formData.get("confirmDelete") === "true" });
    revalidatePath("/admin/products");
    return actionSuccess("Producto eliminado. El historial de órdenes queda preservado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos eliminar el producto."));
  }
}

const pageActions = {
  create: saveProduct,
  update: saveProductUpdate,
  archive: archiveProduct,
  delete: deleteProduct,
};

type AdminProductsPageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams;
  const { q } = params ?? {};
  const { products, pagination } = await listAdminProductsPage({ page: parsePageParam(params?.page), pageSize: ADMIN_PRODUCTS_PAGE_SIZE, search: q });
  return <AdminProductsView products={products} pagination={pagination} actions={pageActions} searchQuery={q ?? ""} />;
}
