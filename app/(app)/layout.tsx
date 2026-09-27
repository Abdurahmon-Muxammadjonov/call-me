import { Bricolage_Grotesque, Onest, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "../pulse/data/QueryProvider";
import { CompanyProvider } from "../lib/company";
import { SectionsProvider } from "../lib/sections";
import { PulseShell } from "../pulse/shell/PulseShell";

/* Pulse Noir shriftlari (§3.5) — faqat ilova qobig'ida yuklanadi, landing
 * sahifasi ularni oldindan yuklamaydi. O'zgaruvchilar .pn-root elementiga
 * qo'yiladi (pulse.css → --pn-font-*). Uchalasi ham VARIABLE shrift: har
 * subset uchun bitta fayl, kerakli og'irliklar (500–800 / 400–700 /
 * 400–600) shu fayl ichida. next/font Google shriftlarida oraliq
 * ("500 800") qabul qilmaydi — to'liq variable o'q yuklanadi. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-pn-jetbrains",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

/* Doimiy qobiq (§3.1): /dashboard/* va /settings/* orasida o'tganda
 * menyu, kesh, jonli ulanish va provayderlar qayta o'rnatilmaydi. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CompanyProvider>
        <SectionsProvider>
          <PulseShell fontClass={`${bricolage.variable} ${onest.variable} ${jetbrains.variable}`}>{children}</PulseShell>
        </SectionsProvider>
      </CompanyProvider>
    </QueryProvider>
  );
}
