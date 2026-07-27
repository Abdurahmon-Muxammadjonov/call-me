import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "SalesPulse — AI Call Center Audit",
  description:
    "SalesPulse: futuristic AI-powered call center quality auditing dashboard.",
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
    document.documentElement.setAttribute('data-locale', loc === 'ru' ? 'ru' : 'uz');
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
