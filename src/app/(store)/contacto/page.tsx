import type { Metadata } from "next";
import { ContactView } from "@/components/store/contact-view";

export const metadata: Metadata = {
  title: "Contacto — Bazar BL",
  description:
    "Canales de contacto y horarios de atención de Bazar BL. Escribinos por WhatsApp, email o visitanos en nuestro local.",
};

export default function ContactPage() {
  return <ContactView />;
}
