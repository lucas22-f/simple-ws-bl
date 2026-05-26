import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentTone = "success" | "pending" | "failure";

type PaymentCta = {
  href: string;
  label: string;
};

type PaymentStateViewProps = {
  tone: PaymentTone;
  kicker: string;
  title: string;
  description: string;
  panelTitle: string;
  panelCopy: string;
  primaryCta: PaymentCta;
  secondaryCta?: PaymentCta;
};

const toneStyles: Record<PaymentTone, { medallion: string; icon: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  success: {
    medallion: "bg-emerald-50 border-emerald-200",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  pending: {
    medallion: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    Icon: Clock3,
  },
  failure: {
    medallion: "bg-red-50 border-red-200",
    icon: "text-red-500",
    Icon: XCircle,
  },
};

export function PaymentStateView({
  tone,
  kicker,
  title,
  description,
  panelTitle,
  panelCopy,
  primaryCta,
  secondaryCta,
}: PaymentStateViewProps) {
  const { Icon, icon, medallion } = toneStyles[tone];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md text-center animate-in-up" aria-labelledby="payment-state-title">
        <div className={cn("mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2", medallion)}>
          <Icon className={cn("h-10 w-10", icon)} aria-hidden="true" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{kicker}</p>
        <h1 id="payment-state-title" className="mt-3 font-heading text-3xl tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">{description}</p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{panelTitle}</p>
          <p className="mt-3 text-sm leading-6 text-foreground">{panelCopy}</p>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={primaryCta.href}
            className="button-lift inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

