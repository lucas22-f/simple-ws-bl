import { Loader2, Settings } from "lucide-react";

export default function AdminLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center animate-in-fade" aria-busy="true" aria-live="polite">
      <div className="loading-card flex max-w-sm flex-col items-center gap-4 rounded-3xl border bg-card p-6 shadow-lg" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Settings className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">Cargando panel</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Preparamos la sección administrativa.</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      </div>
    </main>
  );
}
