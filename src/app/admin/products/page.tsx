import { revalidatePath } from "next/cache";
import { AdminProductsView } from "@/app/admin/products/product-management";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { parsePageParam } from "@/lib/pagination";
import { archiveProductAction, createProductAction, updateProductAction } from "@/server/admin/actions/products";
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

const pageActions = {
  create: saveProduct,
  update: saveProductUpdate,
  archive: archiveProduct,
};

type AdminProductsPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams;
  const { products, pagination } = await listAdminProductsPage({ page: parsePageParam(params?.page), pageSize: ADMIN_PRODUCTS_PAGE_SIZE });
  return <AdminProductsView products={products} pagination={pagination} actions={pageActions} />;
}
