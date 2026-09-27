import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pulse Noir: IndexedDB keshining "buster"i — har yangi build eski
  // saqlangan keshni bekor qiladi (spetsifikatsiya §3.2).
  env: {
    // Vercel muhiti (production | preview | development); lokal — "local".
    // app/lib/api.ts preview'da production backendga ulanmaslik uchun o'qiydi.
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "local",
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || `local-${Date.now()}`,
  },
  // Pin the workspace root to this project. A stray lockfile in a parent
  // directory otherwise makes Turbopack infer the wrong root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
