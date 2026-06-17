import * as React from "react";
import { revalidatePath } from "next/cache";
import { AdminShell } from "@/components/admin/admin-shell";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { ProductCreateForm } from "@/app/admin/products/product-management";
import { createProductAction } from "@/server/admin/actions/products";
import { listActiveCategories } from "@/server/categories/queries";
import { NavigationLink } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

async function saveProduct(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const product = await createProductAction(formData);
    revalidatePath("/admin/products");
    if (product.imageUploadFailed) {
      return actionSuccess("Producto creado, pero no pudimos adjuntar la imagen. Podes editarlo y volver a intentar.");
    }

    return actionSuccess("Producto creado y catalogo actualizado.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos crear el producto."));
  }
}

export default async function AdminProductNewPage() {
  const categories = await listActiveCategories();
  return (
    <AdminShell title="Crear producto" description="Carga la informacion esencial del producto desde una pantalla dedicada, sin mezclar alta y gestion del inventario." hideHeader={true}>


      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:p-6" >

        <div className="flex items-start gap-3">
          <NavigationLink
            href="/admin/products"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            pendingTitle="Cargando productos"
            pendingDescription="Volvemos al listado de productos."
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </NavigationLink>
          <div>
            <h2 className="text-xl font-semibold">Crear producto</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Agrega un nuevo producto</p>
          </div>
        </div>
        <ProductCreateForm action={saveProduct} categories={categories} />
      </section>
    </AdminShell>
  );
}
