import * as React from "react";
import { revalidatePath } from "next/cache";
import { AdminShell } from "@/components/admin/admin-shell";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { ProductCreateForm } from "@/app/admin/products/product-management";
import { createProductAction } from "@/server/admin/actions/products";

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
  return (
    <AdminShell title="Crear producto" description="Carga la informacion esencial del producto desde una pantalla dedicada, sin mezclar alta y gestion del inventario.">
      <section className="rounded-xl border bg-card p-5 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-primary" aria-hidden="true">
            +
          </span>
          <div>
            <h2 className="text-xl font-semibold">Crear producto</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Despues podes editar visibilidad, stock e imagen desde el listado.</p>
          </div>
        </div>
        <ProductCreateForm action={saveProduct} />
      </section>
    </AdminShell>
  );
}
