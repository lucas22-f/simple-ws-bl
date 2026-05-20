import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function PaymentFailurePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <Card className="space-y-4 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-red-700">Pago no completado</p>
        <h1 className="text-3xl font-bold text-stone-950">No pudimos confirmar el pago</h1>
        <p className="text-stone-700">Podés volver al catálogo y reintentar. Si Mercado Pago envía una confirmación después, la orden se actualizará por webhook.</p>
        <Link href="/catalog" className="font-medium text-amber-700 hover:text-amber-900">Volver al catálogo</Link>
      </Card>
    </main>
  );
}

