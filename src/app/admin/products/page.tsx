import { revalidatePath } from "next/cache";
import { AdminProductsView } from "@/app/admin/products/product-management";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { archiveProductAction, createProductAction, updateProductAction } from "@/server/admin/actions/products";
import { listAdminProducts } from "@/server/products/queries";

export const dynamic = "force-dynamic";

async function saveProduct(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    await createProductAction(formData);
    revalidatePath("/admin/products");
    return actionSuccess("Producto creado y catálogo actualizado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos crear el producto."));
  }
}

async function saveProductUpdate(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const productId = formData.get("productId");
    if (typeof productId !== "string") throw new Error("ID de producto inválido");
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
    if (typeof productId !== "string") throw new Error("ID de producto inválido");
    await archiveProductAction(productId);
    revalidatePath("/admin/products");
    return actionSuccess("Producto archivado. Ya no aparece en el catálogo público.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos archivar el producto."));
  }
}

const pageActions = {
  create: saveProduct,
  update: saveProductUpdate,
  archive: archiveProduct,
};

export default async function AdminProductsPage() {
  const products = await listAdminProducts();
  return <AdminProductsView products={products} actions={pageActions} />;
}
