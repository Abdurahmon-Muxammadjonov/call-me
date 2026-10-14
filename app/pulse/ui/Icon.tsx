/* 24-viewBox chiziqli ikonkalar, dumaloq uchlar (spetsifikatsiya §3.3).
 * Yo'llar design/pulse-noir/source/*.dc.html dan AYNAN ko'chirilgan;
 * manbada yo'q bo'lganlari (quyosh, qulf, belgi, menyu, ma'lumot) shu
 * uslubda chizilgan va pastda alohida belgilangan. Ikonka shrifti yoki
 * to'liq kutubxona importi yo'q. */

import type { CSSProperties } from "react";

export const ICON_PATHS = {
  // — Nav.dc.html —
  pulse: "M2 12h4l2.5-6 4.5 12 2.5-6H22",
  chevronsUpDown: "M7 9l5-5 5 5M7 15l5 5 5-5",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  gauge: "M12 13.5l3.5-3.5M4.2 18a9 9 0 1 1 15.6 0",
  compare: "M7 7h13l-4-4M17 17H4l4 4",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  stats: "M4 4v16h16M8 14l3-3 3 3 5-6",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  wave: "M4 12h1M8 8v8M12 5v14M16 9v6M20 11v2",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M4 20h16",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  checkSquare: "M5 4h14v16H5zM9 12l2 2 4-4",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4",
  brand: "M5 21V4h14v17M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  chevronDown: "M6 9l6 6 6-6",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  // — Main / Boshqaruv / Audio / Tahlil / Solishtirish / Xodimlar —
  bell: "M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M4 20h16",
  warning: "M12 4 3 20h18L12 4zM12 10v4M12 17h.01",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14v15H5z",
  filter: "M4 6h16M7 12h10M10 18h4",
  play: "M7 4.5v15l12.5-7.5z",
  pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronUp: "M6 15l6-6 6 6",
  close: "M6 6l12 12M18 6 6 18",
  arrowDownLeft: "M17 7 7 17M7 9v8h8",
  arrowUpRight: "M7 17 17 7M9 7h8v8",
  trendUp: "M3 17l6-6 4 4 8-8M15 7h6v6",
  transfer: "M1 5h23M20 1l4 4-4 4",
  phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  shieldCheck: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  // — Manbada yo'q, shu uslubda qo'shildi (hisobotda "og'ish" sifatida) —
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  menu: "M4 6h16M4 12h16M4 18h16",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  // — CRUD bo'limlari uchun (2026-10-14) —
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4",
  sparkle: "M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  size = 18,
  stroke = 1.9,
  color = "currentColor",
  className,
  style,
  title,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  /* Berilsa — ikonka o'zi ma'no tashiydi (role="img"); aks holda bezak. */
  title?: string;
}) {
  const filled = name === "play" || name === "pause";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
