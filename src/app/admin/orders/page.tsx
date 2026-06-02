import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { AdminOrdersForm } from "@/app/admin/orders/admin-orders-form";
import { updateOrderFulfillmentStatusAction } from "@/server/admin/actions/orders";
import { listAdminOrders } from "@/server/orders/queries";

export const dynamic = "force-dynamic";

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

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();
  return <AdminOrdersForm action={updateOrder} orders={orders} />;
}
