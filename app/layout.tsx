import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientBootstrap } from "./components/ClientBootstrap";
import { bootstrapScript } from "./pulse/lib/bootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Dashboard dizayni 400/500/600/700 og'irliklarini ishlatadi.
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Raqamlar, vaqt, ball, pul — 400/500/600.
  weight: ["400", "500", "600"],
});

// Landing-page-only type system (see app/components/landing): Sora for
// headings, Inter for body copy, JetBrains Mono for stat/KPI figures. Kept
// separate from the Geist vars above so the dashboard's typography is
// untouched — these are only referenced by the `font-heading` /
// `font-landing-body` / `font-mono-stat` utilities defined in globals.css.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500"],
});

const SITE_URL = "https://procell.uz";
const SITE_TITLE = "SalesPulse — AI Call Center Audit";
const SITE_DESCRIPTION =
  "SalesPulse call-center va sotuv qo'ng'iroqlarini sun'iy intellekt yordamida avtomatik audit qiladi: har bir qo'ng'iroq belgilangan mezonlar bo'yicha baholanadi, jonli statistika va jamoa nazorati beriladi.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — SalesPulse",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "SalesPulse",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// Bo'yashdan OLDIN: `data-theme` + eski `.dark` klassi, aksent va til
// (cookie sp_theme / sp_accent / sp_locale; bo'lmasa eski localStorage
// kalitlari). Batafsil: app/pulse/lib/bootstrap.ts.
const themeScript = bootstrapScript();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ClientBootstrap />
        {children}
      </body>
    </html>
  );
}
