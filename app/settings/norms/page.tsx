"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsShell } from "../../components/settings/SettingsShell";
import { useSession } from "../../lib/auth";
import { useHasRole } from "../../lib/useHasRole";
import { showToast } from "../../lib/toast";
import { ToastHost } from "../../components/ToastHost";
import { Icons } from "../../components/Icons";
import { Card, Skeleton } from "../../components/ui";
import {
  fetchCompanySettings,
  updateCompanySettings,
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from "../../lib/companySettings";

/* "Analitika" sahifasidagi KPI ogohlantirish banneri va "NORMA OSTIDA"
 * belgisi shu qiymatlarni ishlatadi (qarang app/lib/analytics.ts →
 * DEFAULT_NORMS, va PROMPT_BACKEND_ANALITIKA.md §3). Backend hali GET/PATCH
 * /company/settings'ni bermasa, bu sahifa standart qiymatlarni ko'rsatadi
 * va saqlash urinishida tushunarli xato beradi (500/404) — sahifaning o'zi
 * hech qachon buzilmaydi. */

const FIELDS: {
  key: keyof CompanySettings;
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  {
    key: "qualified_call_seconds",
    label: "\"Uzun\" qo'ng'iroq chegarasi (soniya)",
    hint: "Shundan uzun bo'lgan qo'ng'iroq \"malakali\" hisoblanadi.",
    min: 1,
    max: 3600,
  },
  {
    key: "min_qualified_calls_day",
    label: "Kunlik minimal uzun qo'ng'iroqlar",
    hint: "Kunlik ko'rinishda shundan kam bo'lsa — \"norma ostida\".",
    min: 0,
    max: 100000,
  },
  {
    key: "min_qualified_calls_week",
    label: "Haftalik minimal uzun qo'ng'iroqlar",
    hint: "Haftalik ko'rinishda shundan kam bo'lsa — \"norma ostida\".",
    min: 0,
    max: 100000,
  },
  {
    key: "min_qualified_calls_month",
    label: "Oylik minimal uzun qo'ng'iroqlar",
    hint: "Oylik ko'rinishda shundan kam bo'lsa — \"norma ostida\".",
    min: 0,
    max: 1000000,
  },
  {
    key: "min_efficiency_score",
    label: "Minimal samaradorlik balli (0–100)",
    hint: "O'rtacha KPI ball shundan past bo'lsa ham \"norma ostida\" belgilanadi.",
    min: 0,
    max: 100,
  },
];

function NormsContent() {
  const session = useSession();
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCompanySettings(session?.token, ctrl.signal)
      .then((s) => {
        setSettings(s);
        setLoading(false);
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setLoading(false);
      });
    return () => ctrl.abort();
  }, [session?.token]);

  function update(key: keyof CompanySettings, value: number) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await updateCompanySettings(session?.token, settings);
      setSettings(saved);
      setDirty(false);
      showToast("KPI normalari saqlandi.", "success");
    } catch (e) {
      showToast((e as Error).message || "Normalarni saqlab bo'lmadi.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="space-y-4 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">KPI norma chegaralari</h2>
        <p className="mt-1 text-xs text-slate-400">
          &quot;Analitika&quot; sahifasidagi KPI ogohlantirish banneri va xodim kartalaridagi &quot;NORMA OSTIDA&quot;
          belgisi shu qiymatlarga asoslanadi — davr (Kunlik/Haftalik/Oylik) bo&apos;yicha alohida.
        </p>

        <div className="mt-5 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {f.label}
              </label>
              <input
                type="number"
                min={f.min}
                max={f.max}
                value={settings[f.key]}
                onChange={(e) => update(f.key, Math.max(f.min, Math.min(f.max, Number(e.target.value) || 0)))}
                className="w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-200"
              />
              <p className="mt-1 text-xs text-slate-400">{f.hint}</p>
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={!dirty || saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-bold text-white transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saqlanmoqda...
            </>
          ) : (
            "Normalarni saqlash"
          )}
        </button>
      </Card>
    </div>
  );
}

export default function NormsSettingsPage() {
  const router = useRouter();
  const session = useSession();
  const canEdit = useHasRole(["director", "admin"]);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (!canEdit) {
      router.replace(session.role === "director" ? "/dashboard" : "/cabinet");
    }
  }, [session, canEdit, router]);

  if (!session || !canEdit) return null;

  return (
    <>
      <SettingsShell title="KPI normalari" subtitle="Analitika sahifasidagi ogohlantirish chegaralarini sozlang">
        {!canEdit ? (
          <Card className="p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
              <Icons.lock className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">Ruxsat yo&apos;q</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Bu sahifa faqat kompaniya direktori/administratori uchun.
            </p>
          </Card>
        ) : (
          <NormsContent />
        )}
      </SettingsShell>
      <ToastHost />
    </>
  );
}
