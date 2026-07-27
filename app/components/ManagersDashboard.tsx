"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { apiClient } from "../lib/api/client";
import { getSupabase } from "../lib/supabase";
import { useT } from "../lib/i18n";

export interface Manager {
  id: string;
  crm_id?: string | null;
  name: string;
  status: string;
}

interface ManagersDashboardResponse {
  success: boolean;
  managers?: Manager[];
  managers_count?: number;
  active_count?: number;
  error?: string;
}

type ApiLikeError = {
  message?: string;
  status?: number;
};

function mapStatusMessage(status: number): string {
  if (status === 400) return "Noto'g'ri so'rov (400). Parametrlarni tekshiring.";
  if (status === 401) return "Avtorizatsiya talab qilinadi (401).";
  if (status === 403) return "Ruxsat yo'q (403).";
  if (status === 404) return "Menejerlar endpoint topilmadi (404).";
  if (status === 408) return "So'rov vaqti tugadi (408).";
  if (status === 409) return "Ma'lumotlar konflikti (409).";
  if (status === 422) return "Yuborilgan ma'lumot formatida xato bor (422).";
  if (status === 429) return "So'rovlar soni limitdan oshdi (429). Biroz kutib qayta urinib ko'ring.";
  if (status === 500) return "Server ichki xatosi (500).";
  if (status === 502) return "Gateway xatosi (502).";
  if (status === 503) return "Server vaqtincha mavjud emas (503).";
  if (status === 504) return "Server javobi kechikdi (504 timeout).";
  return `API xatolik (${status}).`;
}

function mapNetworkMessage(rawMessage?: string): string | null {
  if (!rawMessage) return null;
  const msg = rawMessage.toLowerCase();
  if (msg.includes("econnreset")) return "Ulanish uzilib qoldi (ECONNRESET).";
  if (msg.includes("etimedout") || msg.includes("timeout")) return "So'rov vaqti tugadi (timeout).";
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("fetch failed")) {
    return "Tarmoq xatosi: serverga ulanib bo'lmadi.";
  }
  if (msg.includes("socket hang up")) return "Ulanish kutilmaganda yopildi (socket hang up).";
  return null;
}

function toDashboardError(error: unknown): string {
  if (error instanceof Error) {
    return mapNetworkMessage(error.message) ?? error.message;
  }

  if (error && typeof error === "object") {
    const err = error as ApiLikeError;
    const networkMapped = mapNetworkMessage(err.message);
    if (networkMapped) return networkMapped;

    if (typeof err.status === "number") {
      const base = mapStatusMessage(err.status);
      if (err.message && !err.message.toLowerCase().includes(String(err.status))) {
        return `${base} Tafsilot: ${err.message}`;
      }
      return base;
    }

    if (err.message) return `So'rov xatosi: ${err.message}`;
  }

  return "Noma'lum xato: ma'lumotni yuklab bo'lmadi.";
}

function normalizeStatus(status: string): "online" | "offline" | "away" {
  const s = status.toLowerCase();
  if (s === "active" || s === "online") return "online";
  if (s === "busy" || s === "away") return "away";
  return "offline";
}

function StatusPill({ status }: { status: string }) {
  const t = useT();
  const normalized = normalizeStatus(status);
  const classes =
    normalized === "online"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
      : normalized === "away"
      ? "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400"
      : "bg-slate-500/10 text-slate-500 ring-slate-500/30 dark:text-slate-400";

  const label =
    normalized === "online"
      ? t("managers.status.online")
      : normalized === "away"
      ? t("managers.status.away")
      : t("managers.status.offline");

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ManagersDashboard() {
  const t = useT();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchManagers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<ManagersDashboardResponse>("/crm/dashboard/managers", {
        timeoutMs: 300_000,
      });

      if (data.success) {
        const nextManagers = data.managers ?? [];
        const nextTotal = typeof data.managers_count === "number" ? data.managers_count : nextManagers.length;
        const nextActive =
          typeof data.active_count === "number"
            ? data.active_count
            : nextManagers.filter((manager) => normalizeStatus(manager.status) === "online").length;

        setManagers(nextManagers);
        setStats({ total: nextTotal, active: nextActive });
        setUpdatedAt(new Date());
        setError(null);
        return;
      }

      setError(data.error ?? "Menejerlar ma'lumotini olishda xatolik");
      setManagers([]);
      setStats({ total: 0, active: 0 });
    } catch (e) {
      setError(toDashboardError(e));
      setManagers([]);
      setStats({ total: 0, active: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void fetchManagers();
    }, 0);
    return () => window.clearTimeout(initTimer);
  }, [fetchManagers]);

  /* Realtime: pollingsiz — `managers` jadvalida o'zgarish bo'lganda shu
     zahoti qayta yuklanadi (backend'dagi agregatsiya qilingan
     /crm/dashboard/managers endpointi orqali). */
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel("managers-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "managers" }, () => {
        void fetchManagers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchManagers]);

  const subtitle = useMemo(() => {
    if (!updatedAt) return t("managers.live");
    return `${new Intl.DateTimeFormat(undefined, { timeStyle: "medium" }).format(updatedAt)}`;
  }, [updatedAt, t]);

  return (
    <div className="w-full space-y-4">
      <Card className="p-6">
        <SectionTitle
          title={t("managers.title")}
          subtitle={subtitle}
          action={
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
                {stats.active} {t("managers.active")}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/30 dark:text-slate-300">
                {stats.total} {t("managers.total")}
              </span>
            </div>
          }
        />

        {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {loading && (
          <p className="py-4 text-sm text-slate-500 dark:text-slate-400">
            {t("managers.loading")}
          </p>
        )}

        {!loading && managers.length === 0 && !error && (
          <p className="py-4 text-sm text-slate-500 dark:text-slate-400">{t("managers.empty")}</p>
        )}

        {!loading && managers.length > 0 && (
          <div className="grid gap-2">
            {managers.map((manager) => (
              <div
                key={manager.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/40 p-3 dark:border-slate-700/60 dark:bg-slate-800/30"
              >
                <span className="font-medium text-slate-700 dark:text-slate-200">{manager.name}</span>
                <StatusPill status={manager.status} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => void fetchManagers()}
            disabled={loading}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>
      </Card>
    </div>
  );
}
