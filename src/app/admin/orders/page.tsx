import { actionError, actionSuccess, getErrorMessage, type FormActionState } from "@/lib/form-state";
import { AdminOrdersForm } from "@/app/admin/orders/admin-orders-form";
import { updateOrderFulfillmentStatusAction } from "@/server/admin/actions/orders";

async function updateOrder(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  "use server";
  try {
    await updateOrderFulfillmentStatusAction(formData);
    return actionSuccess("Orden actualizada.");
  } catch (error) {
    return actionError(getErrorMessage(error, "No pudimos actualizar la orden."));
  }
}

export default function AdminOrdersPage() {
  return <AdminOrdersForm action={updateOrder} />;
}