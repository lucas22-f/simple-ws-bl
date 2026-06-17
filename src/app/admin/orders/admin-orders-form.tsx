"use client";

import * as React from "react";
import { useActionState } from "react";
import { Archive, Banknote, ClipboardCheck, Clock3, PackageCheck, PackageSearch, ShoppingBag } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSearchInput } from "@/components/admin/admin-search-input";
import { FieldMessage, FormToast } from "@/components/ui/form-feedback";
import { FormLoadingOverlay } from "@/components/ui/loading-overlay";
import { PaginationControls } from "@/components/ui/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormActionState, type FormActionState } from "@/lib/form-state";
import type { PaginationState } from "@/lib/pagination";
import type { OrderFulfillmentStatus, OrderPaymentStatus } from "@/lib/status";
import type { AdminOrder } from "@/server/orders/queries";

type AdminOrdersFormProps = {
  action: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  archiveAction: (state: FormActionState, formData: FormData) => Promise<FormActionState>;
  orders: AdminOrder[];
  pagination?: PaginationState;
  searchQuery?: string;
};

const fieldClassName = "min-h-11 rounded-xl border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring";

const fulfillmentLabels: Record<OrderFulfillmentStatus, string> = {
  pending: "Pendiente",
  processing: "En preparación",
  shipped: "Enviada",
  cancelled: "Cancelada",
};

const paymentLabels: Record<OrderPaymentStatus, string> = {
  pending: "Pago pendiente",
  paid: "Pagada",
  rejected: "Pago rechazado",
  cancelled: "Pago cancelado",
  refunded: "Reintegrada",
};

const nextFulfillmentStatuses: Record<OrderFulfillmentStatus, OrderFulfillmentStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(priceCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function OrderStatusBadge({ status, type }: { status: OrderFulfillmentStatus | OrderPaymentStatus; type: "fulfillment" | "payment" }) {
  const isPositive = status === "paid" || status === "shipped";
  const isNegative = status === "cancelled" || status === "rejected" || status === "refunded";
  const label = type === "fulfillment" ? fulfillmentLabels[status as OrderFulfillmentStatus] : paymentLabels[status as OrderPaymentStatus];
  const className = isPositive
    ? "bg-emerald-100 text-emerald-800"
    : isNegative
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function OrderUpdateForm({ action, order }: { action: AdminOrdersFormProps["action"]; order: AdminOrder }) {
  const [state, formAction] = useActionState(action, initialFormActionState);
  const nextStatuses = nextFulfillmentStatuses[order.fulfillmentStatus];

  if (nextStatuses.length === 0) {
    return <p className="text-sm font-medium text-muted-foreground">Esta orden ya no admite cambios operativos.</p>;
  }

  return (
    <form action={formAction} className="relative grid gap-3 overflow-hidden rounded-xl border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <FormToast state={state} successTitle="Orden actualizada" />
      <FormLoadingOverlay title="Actualizando orden" description="Guardamos el nuevo estado operativo de la orden." />
      <input name="orderId" type="hidden" value={order.id} />
      <label className="grid gap-1 text-sm font-medium">
        Siguiente estado
        <select className={fieldClassName} name="status" defaultValue={nextStatuses[0]}>
          {nextStatuses.map((status) => <option key={status} value={status}>{fulfillmentLabels[status]}</option>)}
        </select>
        <FieldMessage id={`order-status-help-${order.id}`} message="Solo mostramos transiciones válidas para este pedido." />
      </label>
      <SubmitButton className="button-lift min-h-11" pendingLabel="Actualizando...">
        <PackageCheck className="h-4 w-4" aria-hidden="true" />
        Actualizar
      </SubmitButton>
    </form>
  );
}

function OrderArchiveForm({ action, order }: { action: AdminOrdersFormProps["archiveAction"]; order: AdminOrder }) {
  const [state, formAction] = useActionState(action, initialFormActionState);

  return (
    <form action={formAction} className="relative grid gap-3 overflow-hidden rounded-xl border border-border bg-muted/35 p-3">
      <FormToast state={state} successTitle="Orden archivada" />
      <FormLoadingOverlay title="Archivando orden" description="La ocultamos del listado operativo sin borrar su historial." />
      <input name="orderId" type="hidden" value={order.id} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input className="mt-0.5 h-4 w-4 accent-primary" name="confirmArchive" type="checkbox" value="true" required />
        Conservar historial y archivar la orden de {order.buyerName}. No se eliminarán sus productos ni comprobantes.
      </label>
      <SubmitButton variant="outline" className="button-lift min-h-11 border-border bg-card text-foreground hover:bg-muted" pendingLabel="Archivando orden...">
        <Archive className="h-4 w-4" aria-hidden="true" />
        Archivar orden
      </SubmitButton>
    </form>
  );
}

export function AdminOrdersForm({ action, archiveAction, orders, pagination, searchQuery }: AdminOrdersFormProps) {
  const pendingOrders = orders.filter((order) => order.fulfillmentStatus === "pending").length;
  const processingOrders = orders.filter((order) => order.fulfillmentStatus === "processing").length;
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid").length;

  return (
    <AdminShell title="Órdenes" description="Gestioná pedidos reales, pagos y despachos desde un único panel operativo.">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de órdenes">
        {[
          { label: "Órdenes visibles", value: orders.length, icon: ShoppingBag },
          { label: "Pendientes", value: pendingOrders, icon: Clock3 },
          { label: "En preparación", value: processingOrders, icon: ClipboardCheck },
          { label: "Pagadas", value: paidOrders, icon: Banknote },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="animate-in-up rounded-xl border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
          </article>
        ))}
      </section>

      <AdminSearchInput
        basePath="/admin/orders"
        initialQuery={searchQuery}
        id="admin-orders-search"
        label="Buscar órdenes"
        placeholder="Buscar por nombre o email del cliente"
      />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Pedidos recientes</h2>
          <p className="text-sm leading-6 text-muted-foreground">Mostramos los pedidos por tandas para que el panel siga siendo rápido cuando crezca la tienda.</p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-6 text-muted-foreground">
            <PackageSearch className="h-6 w-6 text-primary" aria-hidden="true" />
            {searchQuery ? (
              <>
                <p className="mt-3 font-semibold text-foreground">No encontramos órdenes para &ldquo;{searchQuery}&rdquo;.</p>
                <p>Probá con otro término de búsqueda o revisá el listado completo.</p>
              </>
            ) : (
              <>
                <p className="mt-3 font-semibold text-foreground">Todavía no hay órdenes para gestionar.</p>
                <p>Cuando ingrese una compra, va a aparecer acá automáticamente.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {orders.map((order) => (
              <article key={order.id} aria-label={`Orden ${order.buyerName}`} className="animate-in-up rounded-xl border border-border bg-card p-4 shadow-[0_2px_8px_rgb(37_26_18/0.06)] sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pedido {order.id.slice(0, 8)}</p>
                    <h3 className="mt-2 text-lg font-semibold">{order.buyerName}</h3>
                    <p className="text-sm text-muted-foreground">{order.buyerEmail}{order.buyerPhone ? ` · ${order.buyerPhone}` : ""}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OrderStatusBadge status={order.paymentStatus} type="payment" />
                    <OrderStatusBadge status={order.fulfillmentStatus} type="fulfillment" />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p className="text-sm font-semibold">Productos</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {order.items.map((item) => <li key={`${item.productName}-${item.quantity}`}>{item.quantity} × {item.productName}</li>)}
                    </ul>
                  </div>
                  <p className="text-lg font-bold text-foreground">{formatPrice(order.totalCents, order.currency)}</p>
                </div>

                <div className="mt-4 grid gap-3">
                  <OrderUpdateForm action={action} order={order} />
                  <OrderArchiveForm action={archiveAction} order={order} />
                </div>
              </article>
              ))}
            </div>
            {pagination ? <PaginationControls pagination={pagination} basePath="/admin/orders" searchParams={{ q: searchQuery || undefined }} itemLabel="órdenes" /> : null}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
