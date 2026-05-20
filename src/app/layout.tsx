import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Bazar Online",
  description: "Tienda web simple y moderna para vender productos de bazar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
        <div className="min-h-screen bg-background text-foreground antialiased">
          {children}
        </div>
      </body>
    </html>
  );
}
