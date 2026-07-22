"use client";

import { useEffect, useState } from "react";
import { fetchBackendHealthWithFallback } from "../lib/api";

interface BackendHealth {
  success: boolean;
  endpoint?: string;
  error?: string;
}

export function ClientBootstrap() {
  const [health, setHealth] = useState<BackendHealth | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const result = await fetchBackendHealthWithFallback(controller.signal);
        clearTimeout(timeout);

        setHealth(result);

        // Global'da backend statusini saqlash (boshqa komponentlar uchun)
        if (typeof window !== "undefined") {
          (window as unknown as Record<string, BackendHealth>).__backendHealth = result;
        }

        // Success bo'lsa, normal loggirni chop etish
        if (result.success) {
          console.log(`✓ Backend connected via ${result.endpoint}`);
        } else {
          // Failure bo'lsa, warning bilan
          console.warn("⚠ Backend health check failed:", result.error);
        }
      } catch (error) {
        console.error("⚠ Critical error during health check:", error);
        setHealth({
          success: false,
          error: "Backend bilan aloqa yo'q",
        });
      }
    };

    // App start'da health check
    checkHealth();

    // Har 30 sekundda qayta check qil (optional)
    // const interval = setInterval(checkHealth, 30000);
    // return () => clearInterval(interval);
  }, []);

  // Agar backend fail bo'lsa va user login screen'da bo'lmasa, banner ko'rsat
  if (health && !health.success) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 bg-red-500/90 px-4 py-3 text-white backdrop-blur-sm">
        <div className="mx-auto max-w-7xl text-center text-sm font-medium">
          ⚠ Backend bilan aloqa yo&apos;q. Replay funksiya ishlayotgan bo&apos;lishi mumkin. Markazsiz qayta urinib ko&apos;ring.
        </div>
      </div>
    );
  }

  return null;
}
