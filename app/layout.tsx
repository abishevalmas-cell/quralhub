import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tetix — запчасти из Китая по VIN", template: "%s · Tetix" },
  description: "Подбор запчастей для китайских автомобилей по VIN, фото и описанию. Доставка из Китая в Казахстан и СНГ.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1519" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${plexMono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
