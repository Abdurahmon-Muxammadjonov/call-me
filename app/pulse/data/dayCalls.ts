"use client";

/* v1: bir kunning barcha qo'ng'iroqlari (sahifalab, /api/calls ko'pi bilan
 * 200 qator beradi) va ulardan operator kesimi. Analitika jamoa jadvali va
 * Solishtirishdagi "Kim o'sdi, kim tushdi" shu keshni bo'lishadi.
 * Spetsifikatsiya §3.2: /calls ro'yxatlari IndexedDB'ga SAQLANMAYDI —
 * faqat xotirada. v2 da sahifa so'rovlari operator kesimini o'zi beradi. */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { listAllCalls, type CallRow } from "../../lib/calls";

export interface OperatorDay {
  key: string;
  ext: string | null;
  name: string | null;
  calls: number;
  longCalls: number;
  incoming: number;
  outgoing: number;
  leads: number | null;
  score10: number | null;
  scored: number;
  talkSec: number;
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function score10(v: number | null | undefined): number | null {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 10 ? x / 10 : x;
}

export function operatorsOf(calls: CallRow[], names: Map<string, string>, longSec: number | null): OperatorDay[] {
  const by = new Map<string, OperatorDay & { sum: number; leadsSeen: boolean }>();
  for (const c of calls) {
    const ext = c.operator_ext?.trim() || null;
    const key = ext ?? c.manager_id ?? "—";
    let r = by.get(key);
    if (!r) {
      r = {
        key, ext, name: (c.manager_id && names.get(c.manager_id)) || null,
        calls: 0, longCalls: 0, incoming: 0, outgoing: 0, leads: 0, score10: null, scored: 0, talkSec: 0,
        sum: 0, leadsSeen: false,
      };
      by.set(key, r);
    }
    r.calls += 1;
    r.talkSec += n(c.duration);
    if (longSec != null && n(c.duration) > longSec) r.longCalls += 1;
    if (c.direction === "incoming") r.incoming += 1;
    else if (c.direction === "outgoing") r.outgoing += 1;
    if (c.new_leads_count != null) {
      r.leadsSeen = true;
      r.leads = (r.leads ?? 0) + n(c.new_leads_count);
    }
    const s = score10(c.kpi_score);
    if (s != null) {
      r.sum += s;
      r.scored += 1;
    }
  }
  return [...by.values()].map(({ sum, leadsSeen, ...row }) => ({
    ...row,
    leads: leadsSeen ? row.leads : null,
    score10: row.scored ? Math.round((sum / row.scored) * 10) / 10 : null,
  }));
}

export function dayCallsKey(companyId: string | undefined, date: string) {
  return ["v1", companyId ?? "_", "calls-day", date] as const;
}

export async function fetchDayCalls(date: string, signal?: AbortSignal): Promise<CallRow[]> {
  return listAllCalls({ date }, signal);
}

export async function fetchManagerNames(signal?: AbortSignal): Promise<Map<string, string>> {
  const list = await apiFetch<Array<{ id: string; name: string }>>("/managers", { signal }).catch(() => null);
  return new Map((Array.isArray(list) ? list : []).map((m) => [m.id, m.name]));
}

export function useDayCalls(companyId: string | undefined, date: string | null, enabled = true) {
  return useQuery({
    queryKey: dayCallsKey(companyId, date ?? ""),
    queryFn: ({ signal }) => fetchDayCalls(date!, signal),
    enabled: enabled && !!companyId && !!date,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useManagerNames(companyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["v1", companyId ?? "_", "manager-names"],
    queryFn: ({ signal }) => fetchManagerNames(signal),
    enabled: enabled && !!companyId,
    staleTime: 5 * 60_000,
  });
}
