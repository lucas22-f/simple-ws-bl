import * as React from "react";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { AdminOrdersForm } from "@/app/admin/orders/admin-orders-form";
import { parsePageParam } from "@/lib/pagination";
import { archiveOrderAction, updateOrderFulfillmentStatusAction } from "@/server/admin/actions/orders";
import { listAdminOrdersPage } from "@/server/orders/queries";

export const dynamic = "force-dynamic";
const ADMIN_ORDERS_PAGE_SIZE = 4;

async function updateOrder(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    await updateOrderFulfillmentStatusAction(formData);
    revalidatePath("/admin/orders");
    return actionSuccess("Orden actualizada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos actualizar la orden."));
  }
}

async function archiveOrder(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    const orderId = formData.get("orderId");
    const confirmArchive = formData.get("confirmArchive");
    if (typeof orderId !== "string") {
      throw new Error("ID de orden inválido");
    }
    if (confirmArchive !== "true") {
      throw new Error("Confirmación de archivo requerida");
    }
    await archiveOrderAction(orderId);
    revalidatePath("/admin/orders");
    return actionSuccess("Orden archivada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos archivar la orden."));
  }
}

type AdminOrdersPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const { orders, pagination } = await listAdminOrdersPage({ page: parsePageParam(params?.page), pageSize: ADMIN_ORDERS_PAGE_SIZE });
  return <AdminOrdersForm action={updateOrder} archiveAction={archiveOrder} orders={orders} pagination={pagination} />;
}
