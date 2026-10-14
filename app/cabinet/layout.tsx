import type { Metadata } from "next";
import { Bricolage_Grotesque, Onest, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "../pulse/data/QueryProvider";
import { CompanyProvider } from "../lib/company";

/* Xodim (operator) kabineti — Pulse Noir (2026-10-15). Direktor qobig'i
 * (PulseShell, menyu) bu yerda yo'q: xodim faqat o'z bo'limlarini ko'radi.
 * Shriftlar (app)/layout.tsx dagidek. */
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin", "latin-ext"], axes: ["opsz"], display: "swap" });
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext", "cyrillic"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-pn-jetbrains", subsets: ["latin", "latin-ext", "cyrillic"], display: "swap" });

export const metadata: Metadata = { title: "Kabinet" };

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CompanyProvider>
        <div className={`${bricolage.variable} ${onest.variable} ${jetbrains.variable} pn-root min-h-dvh text-pn-text`}>{children}</div>
      </CompanyProvider>
    </QueryProvider>
  );
}
