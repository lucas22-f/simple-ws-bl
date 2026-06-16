import * as React from "react";
import { Clock, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavigationLink } from "@/components/ui/navigation-link";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ContactChannel = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external: boolean;
  openInNewTab: boolean;
};

/* ------------------------------------------------------------------ */
/*  Static data                                                       */
/* ------------------------------------------------------------------ */

const contactChannels: ContactChannel[] = [
  {
    title: "WhatsApp / Teléfono",
    description:
      "Escribinos por WhatsApp para consultas, pedidos personalizados o cualquier duda que tengas.",
    href: "https://wa.me/5491123456789",
    icon: MessageCircle,
    external: true,
    openInNewTab: true,
  },
  {
    title: "Correo electrónico",
    description:
      "Mandanos un email y te respondemos a la brevedad. Incluí tu número de orden si es sobre un pedido.",
    href: "mailto:hola@bazarbl.com",
    icon: Mail,
    external: true,
    openInNewTab: false,
  },
  {
    title: "Instagram / Redes sociales",
    description:
      "Seguinos en Instagram para conocer las novedades, promociones y el detrás de escena de Bazar BL.",
    href: "https://instagram.com/bazarbl",
    icon: Instagram,
    external: true,
    openInNewTab: true,
  },
  {
    title: "Ubicación / Dirección",
    description:
      "Visitanos en nuestro local. Te recomendamos consultar horarios antes de acercarte.",
    href: "https://maps.google.com/?q=Bazar+BL",
    icon: MapPin,
    external: true,
    openInNewTab: true,
  },
];

const businessHours = [
  { day: "Lunes a viernes", hours: "10:00 — 18:00" },
  { day: "Sábados", hours: "10:00 — 14:00" },
  { day: "Domingos y feriados", hours: "Cerrado" },
];

/* ------------------------------------------------------------------ */
/*  View                                                              */
/* ------------------------------------------------------------------ */

export function ContactView() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 font-body sm:px-6 sm:py-10 lg:px-8">
      <section className="space-y-8 lg:space-y-10" aria-labelledby="contact-title">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-4xl border border-border bg-card shadow-sm animate-in-up">
          <div className="bg-muted px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <NavigationLink
              className="inline-flex text-sm font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/"
              pendingTitle="Cargando inicio"
              pendingDescription="Volvemos a la tienda principal."
            >
              Inicio
            </NavigationLink>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Contacto
            </p>
            <h1
              id="contact-title"
              className="mt-3 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
            >
              Canales de contacto y dónde encontrarnos
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Estamos cerca para ayudarte. Elegí el canal que más te guste y
              conversemos.
            </p>
          </div>
        </div>

        {/* ── Contact cards grid ──────────────────────────────── */}
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          aria-label="Canales de contacto"
        >
          {contactChannels.map((channel) => {
            const Icon = channel.icon;

            return (
              <Card
                key={channel.title}
                className="group animate-in-up overflow-hidden rounded-xl border-border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(37_26_18/0.12)] sm:rounded-3xl"
              >
                {channel.external ? (
                  <a
                    href={channel.href}
                    target={channel.openInNewTab ? "_blank" : undefined}
                    rel={
                      channel.openInNewTab
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CardHeader className="flex flex-row items-center gap-4 p-5 sm:p-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-lg text-foreground">
                        {channel.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {channel.description}
                      </p>
                    </CardContent>
                  </a>
                ) : (
                  <NavigationLink
                    href={channel.href}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    pendingTitle="Cargando"
                    pendingDescription="Preparamos la sección."
                  >
                    <CardHeader className="flex flex-row items-center gap-4 p-5 sm:p-6">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-lg text-foreground">
                        {channel.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {channel.description}
                      </p>
                    </CardContent>
                  </NavigationLink>
                )}
              </Card>
            );
          })}
        </div>

        {/* ── Business hours ──────────────────────────────────── */}
        <section
          className="animate-in-up rounded-4xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10"
          aria-labelledby="hours-title"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="hours-title"
                className="font-heading text-2xl font-semibold tracking-tight text-foreground"
              >
                Horarios de atención
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Estamos disponibles en estos horarios para consultas y atención
                personalizada.
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-border">
            {businessHours.map((entry) => (
              <div
                key={entry.day}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {entry.day}
                </span>
                <span
                  className={
                    entry.hours === "Cerrado"
                      ? "text-sm text-muted-foreground/60"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {entry.hours}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mapa — Google Maps Embed ──────────────────────── */}
        <section aria-labelledby="map-heading" className="animate-in-up">
          <h2 id="map-heading" className="sr-only">
            Ubicación en el mapa
          </h2>
          <div className="overflow-hidden rounded-4xl border border-border bg-card shadow-sm">
            <iframe
              src="https://www.google.com/maps?q=Ezeiza,+Provincia+de+Buenos+Aires,+Argentina&output=embed&z=13"
              width="100%"
              height="300"
              className="sm:h-[400px]"
              loading="lazy"
              title="Mapa de Ezeiza, Buenos Aires"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </section>
    </main>
  );
}
