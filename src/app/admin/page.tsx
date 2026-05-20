import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Admin</p>
        <h1 className="text-3xl font-bold text-stone-950">Panel del bazar</h1>
        <p className="text-stone-600">Gestioná productos, órdenes y configuración operativa desde un área protegida.</p>
      </div>
      <nav className="grid gap-4 sm:grid-cols-3">
        <Link className="rounded-2xl border p-5 font-semibold hover:bg-stone-50" href="/admin/products">Productos</Link>
        <Link className="rounded-2xl border p-5 font-semibold hover:bg-stone-50" href="/admin/orders">Órdenes</Link>
        <Link className="rounded-2xl border p-5 font-semibold hover:bg-stone-50" href="/admin/settings">Settings</Link>
      </nav>
    </main>
  );
}

