import { ApiError } from "../lib/api";

export interface AnalyticsError {
  type: "network" | "not_found" | "server_error" | "unknown";
  message: string;
  path?: string;
  status?: number;
  retryable: boolean;
}

export function categorizeError(error: unknown): AnalyticsError {
  if (error instanceof ApiError) {
    const details = error.details;
    if (details.isNotFound) {
      return {
        type: "not_found",
        message: `Analytics endpoint topilmadi (404): ${details.path}`,
        path: details.path,
        status: 404,
        retryable: false,
      };
    }

    if (details.isServerError) {
      return {
        type: "server_error",
        message: `Server xatosi (${details.status}): ${details.path}. Markazsiz qayta urinib ko'ring.`,
        path: details.path,
        status: details.status,
        retryable: true,
      };
    }

    // Boshqa HTTP errorlar (4xx)
    if (details.status > 0) {
      return {
        type: "network",
        message: `Backend xatosi (${details.status}): ${details.statusText}`,
        path: details.path,
        status: details.status,
        retryable: true,
      };
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return {
        type: "network",
        message: "Tarmoq xatosi: serverga ulanib bo'lmadi. Internet ulanishini tekshiring.",
        retryable: true,
      };
    }

    if (msg.includes("abort")) {
      return {
        type: "network",
        message: "So'rov vaqti tugadi. Backend kechikib javob berdi.",
        retryable: true,
      };
    }
  }

  return {
    type: "unknown",
    message: `Noma'lum xato: ${String(error)}`,
    retryable: true,
  };
}

interface AnalyticsErrorUIProps {
  error: AnalyticsError;
  onRetry?: () => void;
}

export function AnalyticsErrorUI({ error, onRetry }: AnalyticsErrorUIProps) {
  const icon =
    error.type === "not_found"
      ? "🔍"
      : error.type === "server_error"
        ? "⚠️"
        : error.type === "network"
          ? "🌐"
          : "❌";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="flex gap-3">
        <div className="text-lg">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{error.message}</p>
          {error.status && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Xato kodi: {error.status}
              {error.path && ` · ${error.path}`}
            </p>
          )}
        </div>
      </div>
      {error.retryable && onRetry && (
        <div className="mt-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            🔄 Qayta urinish
          </button>
        </div>
      )}
    </div>
  );
}

export function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-12 w-full rounded-lg border border-slate-200/30 bg-white/40 animate-pulse dark:border-slate-700/30 dark:bg-slate-800/30" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-20 rounded-lg border border-slate-200/30 bg-white/40 animate-pulse dark:border-slate-700/30 dark:bg-slate-800/30" />
        <div className="h-20 rounded-lg border border-slate-200/30 bg-white/40 animate-pulse dark:border-slate-700/30 dark:bg-slate-800/30" />
      </div>
    </div>
  );
}
