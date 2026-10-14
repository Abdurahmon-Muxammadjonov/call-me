"use client";

/* Baholash mezonlari (/criteria) — "Baholash mezonlari" va "Mezon
 * kategoriyalari" bo'limlari BITTA keshni bo'lishadi: biri o'zgartirsa,
 * ikkinchisi ham darhol yangilanadi (2026-10-14). */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { listCriteria } from "../../lib/criteria";
import { useMe } from "./me";

export function useCriteria() {
  const { data: me } = useMe();
  const key = ["v1", me?.company.id ?? "_", "/criteria"] as const;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listCriteria(signal),
    enabled: !!me,
    staleTime: 30_000,
  });
  const companyId = me?.company.id ?? "_";
  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["v1", companyId, "/criteria"] }),
    [qc, companyId]
  );
  return { ...query, invalidate };
}
