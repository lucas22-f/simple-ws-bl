import { revalidatePath } from "next/cache";
import { AdminProductsView } from "@/app/admin/products/product-management";
import { archiveProductAction, createProductAction, updateProductAction } from "@/server/admin/actions/products";
import { listAdminProducts } from "@/server/products/queries";

export const dynamic = "force-dynamic";

async function saveProduct(formData: FormData) {
  "use server";
  await createProductAction(formData);
  revalidatePath("/admin/products");
}

async function saveProductUpdate(formData: FormData) {
  "use server";
  const productId = formData.get("productId");
  if (typeof productId !== "string") throw new Error("ID de producto inválido");
  await updateProductAction(productId, formData);
  revalidatePath("/admin/products");
}

async function archiveProduct(formData: FormData) {
  "use server";
  const productId = formData.get("productId");
  if (typeof productId !== "string") throw new Error("ID de producto inválido");
  await archiveProductAction(productId);
  revalidatePath("/admin/products");
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
