"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "./ui";
import { apiClient } from "../lib/api/client";

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

function toDashboardError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const err = error as ApiLikeError;
    if (err.status === 404) return "Menejerlar endpoint topilmadi (404).";
    if (err.status === 500) return "Server ichki xatosi (500). Keyinroq urinib ko'ring.";
    if (typeof err.status === "number" && err.message) return `${err.message} (${err.status})`;
    if (err.message) return err.message;
  }
  return "Yuklab bo'lmadi";
}

function normalizeStatus(status: string): "online" | "offline" | "away" {
  const s = status.toLowerCase();
  if (s === "active" || s === "online") return "online";
  if (s === "busy" || s === "away") return "away";
  return "offline";
}

function StatusPill({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const classes =
    normalized === "online"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
      : normalized === "away"
      ? "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400"
      : "bg-slate-500/10 text-slate-500 ring-slate-500/30 dark:text-slate-400";

  const label = normalized === "online" ? "online" : normalized === "away" ? "away" : "offline";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ManagersDashboard() {
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
    const t = window.setTimeout(() => {
      void fetchManagers();
    }, 0);
    const interval = setInterval(() => {
      void fetchManagers();
    }, 30_000);
    return () => {
      window.clearTimeout(t);
      clearInterval(interval);
    };
  }, [fetchManagers]);

  const subtitle = useMemo(() => {
    if (!updatedAt) return "Har 30 soniyada avtomatik yangilanadi";
    return `Oxirgi yangilanish: ${updatedAt.toLocaleTimeString()}`;
  }, [updatedAt]);

  return (
    <div className="w-full space-y-4">
      <Card className="p-6">
        <SectionTitle
          title="Menejerlar"
          subtitle={subtitle}
          action={
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
                {stats.active} aktiv
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/30 dark:text-slate-300">
                {stats.total} umumiy
              </span>
            </div>
          }
        />

        {error && <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {loading && (
          <p className="py-4 text-sm text-slate-500 dark:text-slate-400">
            Ma&apos;lumotlar yuklanmoqda, kuting...
          </p>
        )}

        {!loading && managers.length === 0 && !error && (
          <p className="py-4 text-sm text-slate-500 dark:text-slate-400">Hech qanday menejer topilmadi</p>
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
            className="rounded-xl bg-linear-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>
      </Card>
    </div>
  );
}
