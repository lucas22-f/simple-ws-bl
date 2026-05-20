import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <Card className="space-y-4 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-emerald-700">Pago recibido</p>
        <h1 className="text-3xl font-bold text-stone-950">Estamos verificando tu pago</h1>
        <p className="text-stone-700">
          Esta pantalla confirma que volviste desde Mercado Pago, pero NO marca la orden como pagada. El estado real se
          actualiza cuando llega el webhook firmado.
        </p>
        <Link href="/catalog" className="font-medium text-amber-700 hover:text-amber-900">Seguir mirando productos</Link>
      </Card>
    </main>
  );
}

