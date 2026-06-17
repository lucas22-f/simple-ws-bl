import { ArrowRight, ClipboardCheck, PackageSearch, ReceiptText, Settings, Store, Tags } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { NavigationLink } from "@/components/ui/navigation-link";

const quickActions = [
  {
    href: "/admin/products",
    label: "Productos",
    description: "Actualizá el catálogo, revisá precios y mantené la vidriera lista para vender.",
    icon: PackageSearch,
    pendingTitle: "Cargando productos",
    pendingDescription: "Abrimos la gestión del catálogo.",
  },
  {
    href: "/admin/orders",
    label: "Órdenes",
    description: "Acompañá los pedidos, validá estados y priorizá la atención del día.",
    icon: ReceiptText,
    pendingTitle: "Cargando órdenes",
    pendingDescription: "Abrimos la gestión de pedidos.",
  },
  {
    href: "/admin/settings",
    label: "Configuración",
    description: "Ajustá las reglas operativas de la tienda sin tocar el flujo de compra.",
    icon: Settings,
    pendingTitle: "Cargando configuración",
    pendingDescription: "Abrimos las reglas operativas de la tienda.",
  },
  {
    href: "/admin/categories",
    label: "Categorías",
    description: "Creá, editá y organizá las categorías de productos.",
    icon: Tags,
    pendingTitle: "Cargando categorías",
    pendingDescription: "Abrimos la gestión de categorías.",
  },
];

const operations = [
  "Revisar el catálogo antes de publicar cambios visibles.",
  "Atender primero los pedidos que necesitan confirmación operativa.",
  "Mantener la configuración alineada con la disponibilidad real de la tienda.",
];

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Panel del bazar" description="Gestioná productos, órdenes y configuración operativa desde un área protegida.">
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="admin-overview-title">
        <div className="animate-in-up rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgb(37_26_18/0.08)] sm:p-7 lg:p-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Operación diaria
          </span>
          <div className="mt-5 max-w-3xl">
            <h2 id="admin-overview-title" className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Un punto de control claro para mantener la tienda en movimiento.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Empezá por la tarea que sostiene la venta de hoy: catálogo, pedidos o reglas de operación. Este panel no muestra métricas inventadas; te orienta hacia las acciones reales del admin.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <NavigationLink
              href="/admin/products"
              className="button-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              pendingTitle="Cargando productos"
              pendingDescription="Abrimos la gestión del catálogo."
            >
              Ir al catálogo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </NavigationLink>
            <NavigationLink
              href="/"
              className="button-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              pendingTitle="Cargando tienda"
              pendingDescription="Volvemos a la experiencia pública de compra."
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Ver tienda
            </NavigationLink>
          </div>
        </div>

        <aside className="animate-in-up rounded-3xl border border-border bg-muted/60 p-5 sm:p-6" aria-labelledby="admin-guidance-title">
          <h2 id="admin-guidance-title" className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Guía rápida
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Una secuencia simple para operar sin perder contexto entre secciones.
          </p>
          <ul className="mt-5 space-y-3">
            {operations.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-2xl border border-border bg-card p-3 text-sm leading-6 text-muted-foreground">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <nav className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Accesos rápidos de administración">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <NavigationLink
              key={action.href}
              className="group animate-in-up flex min-h-52 flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-[0_8px_22px_rgb(37_26_18/0.07)] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_16px_34px_rgb(37_26_18/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
              href={action.href}
              pendingTitle={action.pendingTitle}
              pendingDescription={action.pendingDescription}
            >
              <span className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition group-hover:border-primary/50 group-hover:text-primary" aria-hidden="true">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </span>
              <span>
                <span className="font-heading text-2xl font-bold tracking-tight text-foreground">{action.label}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{action.description}</span>
              </span>
            </NavigationLink>
          );
        })}
      </nav>
    </AdminShell>
  );
}
