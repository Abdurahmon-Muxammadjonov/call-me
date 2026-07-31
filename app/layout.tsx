import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientBootstrap } from "./components/ClientBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

// Runs before paint to set the theme class + locale attribute, preventing a
// light/dark and language flash (mirrors the same "set DOM before hydration,
// read the DOM back as the source of truth" trick for both).
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('procell-theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
  try {
    var loc = localStorage.getItem('procell-locale');
    document.documentElement.setAttribute('data-locale', (loc === 'ru' || loc === 'en') ? loc : 'uz');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
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
