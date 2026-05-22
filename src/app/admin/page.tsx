import { AdminShell } from "@/components/admin/admin-shell";
import { NavigationLink } from "@/components/ui/navigation-link";

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Panel del bazar" description="Gestioná productos, órdenes y configuración operativa desde un área protegida.">
      <nav className="grid gap-4 sm:grid-cols-3" aria-label="Accesos rápidos de administración">
        <NavigationLink className="rounded-2xl border bg-card p-5 font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/admin/products" pendingTitle="Cargando productos" pendingDescription="Abrimos la gestión del catálogo.">
          Productos
        </NavigationLink>
        <NavigationLink className="rounded-2xl border bg-card p-5 font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/admin/orders" pendingTitle="Cargando órdenes" pendingDescription="Abrimos la gestión de pedidos.">
          Órdenes
        </NavigationLink>
        <NavigationLink className="rounded-2xl border bg-card p-5 font-semibold shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/admin/settings" pendingTitle="Cargando configuración" pendingDescription="Abrimos las reglas operativas de la tienda.">
          Configuración
        </NavigationLink>
      </nav>
    </AdminShell>
  );
}
