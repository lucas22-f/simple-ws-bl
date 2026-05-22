import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center animate-in-fade" aria-busy="true" aria-live="polite">
      <div className="loading-card flex max-w-sm flex-col items-center gap-4 rounded-3xl border bg-card p-6 shadow-lg" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">Cargando tienda</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Preparamos el contenido sin romper el flujo de compra.</p>
        </div>
      </div>
    </main>
  );
}
