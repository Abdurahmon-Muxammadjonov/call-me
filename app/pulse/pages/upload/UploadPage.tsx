"use client";

/* AUDIO YUKLASH — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski UploadView mantiqi o'zgarmagan: menejer (ixtiyoriy), audio manbasi —
 * havola (URL) yoki fayl, analyzeCall / analyzeCallFile, natija kartasi
 * (KPI, jarima, bonus, ROP izohi, transkripsiya, yo'qotish sabablari).
 * Qo'shimcha: "📅 Sana" — o'sha kunning xulosasi va o'sha kuni tahlil
 * qilingan qo'ng'iroqlar (bosilsa Audio yozuvlarda ochiladi). */

import { useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, ExtBadge, ScoreChip, Segmented, Skeleton } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Field, Notice, SelectInput, TextInput } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { DayStrip } from "../../ui/DayStrip";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useCallsPage } from "../../data/calls";
import { useCallNames } from "../calls/AudioPage";
import { listManagers, analyzeCall, analyzeCallFile, type Manager, type AnalyzeResult } from "../../../lib/calls";
import { scoreTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt } from "../../lib/format";
import { dayMonth, hmOf, type Loc } from "../../lib/dates";

type Mode = "url" | "file";
type Status = "idle" | "analyzing" | "done" | "error";

export function UploadPage() {
  const t = usePT();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerId, setManagerId] = useState("");
  const [mode, setMode] = useState<Mode>("url");
  const [audioUrl, setAudioUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tahlil qaysi menejer nomidan yozilishini tanlash uchun (ixtiyoriy).
  useEffect(() => {
    const ctrl = new AbortController();
    listManagers(ctrl.signal)
      .then((list) => {
        setManagers(list);
        setManagerId((cur) => cur || list[0]?.id || "");
      })
      .catch(() => {
        /* menejerlar olinmadi — tanlov bo'sh qoladi */
      });
    return () => ctrl.abort();
  }, []);

  const isUrlValid = /^https?:\/\/\S+$/i.test(audioUrl.trim());
  const inputReady = mode === "url" ? isUrlValid : !!file;
  const canSubmit = inputReady && status !== "analyzing";

  async function handleAnalyze(e: SyntheticEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("analyzing");
    setError(null);
    setResult(null);
    try {
      const res =
        mode === "file" && file
          ? await analyzeCallFile({ file, manager_id: managerId })
          : await analyzeCall({ audio_url: audioUrl.trim(), manager_id: managerId });
      setResult(res);
      setStatus("done");
      // Yangi tahlil boshqa bo'limlarda ham darhol ko'rinsin.
      void qc.invalidateQueries({ queryKey: ["v1", me?.company.id ?? "_", "/api/calls"] });
      void qc.invalidateQueries({ queryKey: ["v1", me?.company.id ?? "_", "/analytics/daily-summary"] });
    } catch (err) {
      setError((err as Error).message || t("up.failed"));
      setStatus("error");
    }
  }

  const pickFile = (f: File | null) => {
    setFile(f);
    setError(null);
  };

  return (
    <div className="@container/up flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("up.eyebrow")}</span>}
        title={t("up.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="UP-DATE" />
            <HeaderBell />
          </>
        }
      />

      <DayStrip date={sel.date} isToday={sel.isToday} testId="UP-DAY" />

      <div className="flex flex-col gap-4 @min-[1000px]/up:flex-row @min-[1000px]/up:items-start">
        <Card pad="lg" className="min-w-0 @min-[1000px]/up:flex-[1.3_1_0]">
          <h2 className="pn-card-title">{t("up.form.title")}</h2>
          <p className="pn-card-sub">{t("up.form.sub")}</p>

          <form onSubmit={handleAnalyze} className="mt-6 flex flex-col gap-5">
            <Field label={t("up.f.manager")} icon="users" optional={t("up.f.optional")}>
              {(id) => (
                <SelectInput id={id} value={managerId} onChange={(e) => setManagerId(e.target.value)} data-testid="UP-MANAGER">
                  <option value="">{t("up.f.noManager")}</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </SelectInput>
              )}
            </Field>

            <div>
              <span className="pn-section-label mb-2 flex items-center gap-2 text-pn-muted">
                <Icon name="wave" size={14} /> {t("up.f.source")}
              </span>
              <Segmented<Mode>
                value={mode}
                onChange={(m) => { setMode(m); setError(null); }}
                inCard
                ariaLabel={t("up.f.source")}
                options={[
                  { value: "url", label: t("up.mode.url"), icon: "link", testId: "UP-MODE-url" },
                  { value: "file", label: t("up.mode.file"), icon: "upload", testId: "UP-MODE-file" },
                ]}
              />
              <div className="mt-3">
                {mode === "url" ? (
                  <Field label={t("up.f.url")} hint={<><Icon name="lock" size={12} /> {t("up.f.urlHint")}</>}>
                    {(id) => (
                      <TextInput id={id} type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://…/qongiroq.mp3" mono data-testid="UP-URL" />
                    )}
                  </Field>
                ) : (
                  <>
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDrag(false);
                        pickFile(e.dataTransfer.files?.[0] ?? null);
                      }}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed px-4 py-9 text-center transition-colors ${
                        drag ? "border-pn-accent bg-pn-accent-soft" : "border-pn-border-3 bg-pn-field hover:border-pn-muted"
                      }`}
                      data-testid="UP-DROP"
                    >
                      <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-pn-accent text-pn-accent-ink">
                        <Icon name={file ? "file" : "upload"} size={20} />
                      </span>
                      {file ? (
                        <span className="text-[14px] font-semibold text-pn-text">
                          {file.name} <span className="pn-mono font-normal text-pn-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-[14px] font-semibold text-pn-text">{t("up.drop")}</span>
                          <span className="text-[12px] text-pn-subtle">{t("up.dropHint")}</span>
                        </>
                      )}
                    </label>
                    {file && (
                      <Button variant="link" icon="close" className="mt-2 text-pn-bad-text!" onClick={() => pickFile(null)}>{t("up.removeFile")}</Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <Button variant="primary" type="submit" disabled={!canSubmit} loading={status === "analyzing"} icon={status === "analyzing" ? undefined : "scan"} className="w-full" testId="UP-SUBMIT">
              {status === "analyzing" ? t("up.analyzing") : t("up.start")}
            </Button>
          </form>

          {status === "analyzing" && (
            <Notice tone="neutral" busy className="mt-5">
              <p className="text-pn-text">{t("up.progress")}</p>
              <span className="mt-3 block h-[5px] w-full overflow-hidden rounded-full bg-pn-panel-3">
                <span className="block h-full w-1/2 animate-pulse rounded-full bg-pn-accent" />
              </span>
              <p className="mt-2 text-[12px] text-pn-muted">{t("up.progressHint")}</p>
            </Notice>
          )}
          {status === "error" && error && <Notice tone="bad" className="mt-5" testId="UP-ERROR">{error}</Notice>}
        </Card>

        <div className="flex min-w-0 flex-col gap-4 @min-[1000px]/up:flex-[1_1_0]">
          <Card pad="lg" className="min-w-0">
            <h2 className="pn-card-title">{t("up.result")}</h2>
            {status === "done" && result ? (
              <ResultView result={result} />
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-pn-panel-2 text-pn-muted"><Icon name="wave" size={22} /></span>
                <p className="mt-4 text-[14px] text-pn-text-2">{t("up.resultEmpty")}</p>
                <p className="mt-1 max-w-xs text-[12px] text-pn-subtle">{t("up.resultEmptyHint")}</p>
              </div>
            )}
          </Card>
          <DayAnalyses date={sel.date} isToday={sel.isToday} />
        </div>
      </div>
    </div>
  );
}

/* Tahlil natijasi (eski AnalyzeResultCard bilan bir xil ma'lumot). */
function ResultView({ result }: { result: AnalyzeResult }) {
  const t = usePT();
  const { data: me } = useMe();
  const a = result.audit;
  const s10 = Number.isFinite(Number(a.kpi_score)) ? Number(a.kpi_score) / 10 : null;
  const st = scoreTone(s10, me?.norms.targetScore10 ?? null);
  return (
    <div className="mt-5 flex flex-col gap-5" data-testid="UP-RESULT">
      <Notice tone="good">{t("up.done", { name: result.manager.name })}</Notice>
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "kpi", label: t("up.kpi"), value: s10 == null ? "—" : fmtDec(s10), color: TONE_VARS[st.tone].text },
          { k: "pen", label: t("up.penalty"), value: fmtInt(a.penalty_amount || 0), color: a.penalty_amount ? "var(--pn-bad-text)" : undefined },
          { k: "bon", label: t("up.bonus"), value: fmtInt(a.bonus_amount || 0), color: a.bonus_amount ? "var(--pn-good-text)" : undefined },
        ].map((x) => (
          <div key={x.k} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-pn-panel-2 px-4 py-3">
            <span className="truncate text-[12px] text-pn-muted">{x.label}</span>
            <span className="pn-display truncate text-[22px] leading-none" style={{ color: x.color }}>{x.value}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="pn-section-label mb-2 text-pn-muted">{t("up.rop")}</p>
        <p className="rounded-2xl bg-pn-panel-2 px-4 py-3 text-[14px] leading-relaxed text-pn-text-2">{a.rop_comment || t("up.noComment")}</p>
      </div>
      {a.transcript && (
        <details className="group rounded-2xl border border-pn-border-2">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold text-pn-text">
            {t("up.transcript")}
            <Icon name="chevronDown" size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <p className="max-h-60 overflow-y-auto whitespace-pre-line border-t border-pn-border px-4 py-3 text-[13px] leading-relaxed text-pn-text-2">{a.transcript}</p>
        </details>
      )}
      {a.lost_reasons.length > 0 && (
        <div>
          <p className="pn-section-label mb-2 text-pn-muted">{t("up.lost")}</p>
          <ul className="flex flex-col gap-[6px]">
            {a.lost_reasons.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: TONE_VARS.bad.tint }}>
                <span className="text-pn-text-2">{r.reason_text}</span>
                <span className="pn-mono shrink-0 font-semibold" style={{ color: TONE_VARS.bad.text }}>×{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button variant="outline" compact iconRight="chevronRight" href={`/dashboard/recordings?open=${result.call_id}`}>{t("up.openCall")}</Button>
    </div>
  );
}

/* Tanlangan kuni tahlil qilingan so'nggi qo'ng'iroqlar. */
function DayAnalyses({ date, isToday }: { date: string; isToday: boolean }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const { data: me } = useMe();
  const nameOf = useCallNames();
  const page = useCallsPage({ date, filter: "scored", page: 0, pageSize: 6 });
  const target = me?.norms.targetScore10 ?? null;
  const base = `/dashboard/recordings?${isToday ? "" : `date=${date}&`}`;
  return (
    <Card pad="none" className="overflow-hidden" data-testid="UP-DAYLIST">
      <div className="flex items-baseline justify-between gap-3 px-6 pb-3 pt-5">
        <h2 className="pn-card-title">{isToday ? t("up.day.today") : t("up.day.past", { date: dayMonth(loc, date) })}</h2>
        {page.data && <span className="pn-mono text-[12px] text-pn-muted">{fmtInt(page.data.total)}</span>}
      </div>
      {page.isPending ? (
        <div className="flex flex-col gap-2 px-6 pb-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={44} r={14} />)}</div>
      ) : !page.data || page.data.rows.length === 0 ? (
        <p className="px-6 pb-6 text-[13px] text-pn-muted">{t("up.day.empty")}</p>
      ) : (
        <ul className="flex flex-col pb-2">
          {page.data.rows.map((r) => {
            const s10 = r.kpi_score > 0 ? r.kpi_score / 10 : null;
            return (
              <li key={r.id}>
                <Link href={`${base}open=${r.id}`} className="pn-press flex items-center gap-3 px-6 py-[10px] hover:bg-pn-panel-2">
                  <ExtBadge size="audio">{r.operator_ext || "—"}</ExtBadge>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-pn-text">{nameOf(r)}</span>
                  <span className="pn-mono text-[12px] text-pn-muted">{hmOf(new Date(r.created_at))}</span>
                  {s10 != null && <ScoreChip tone={scoreTone(s10, target).tone}>{fmtDec(s10)}</ScoreChip>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {page.data && page.data.total > page.data.rows.length && (
        <div className="border-t border-pn-border px-6 py-3">
          <Button variant="link" iconRight="chevronRight" href={`${base}f=scored`}>{t("up.day.all", { n: fmtInt(page.data.total) })}</Button>
        </div>
      )}
    </Card>
  );
}
