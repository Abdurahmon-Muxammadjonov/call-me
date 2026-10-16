"use client";

/* amoCRM ULANISHI — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski AmoCrmView mantiqi o'zgarmagan: holat (GET /crm/status), saqlash
 * (POST /crm/connect-simple), test (POST /crm/test-connection; webhook shu
 * backend hostiga qarasa — haqiqiy so'rovsiz faollashtiriladi), sozlama
 * brauzerda (localStorage "procell-amocrm") ham saqlanadi.
 * Qo'shimcha: "📅 Sana" — o'sha kuni integratsiya orqali kelgan
 * qo'ng'iroqlar xulosasi va oxirgi 14 kunlik oqim (kun bosilsa tanlanadi). */

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, StatusPill } from "../../ui/primitives";
import { Icon, type IconName } from "../../ui/Icon";
import { Field, Notice, Switch, TextInput } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { DayStrip } from "../../ui/DayStrip";
import { CrmManagersCard } from "./CrmManagersCard";
import { TelegramReportCard } from "./TelegramReportCard";
import { CrmIntegrationsCard } from "./CrmIntegrationsCard";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { API_BASE } from "../../../lib/api";
import { getStatus as getCrmStatus, connectSimple as saveCrmConnection, testConnection as testCrmConnection } from "../../../lib/api/crm";
import { fmtInt } from "../../lib/format";
import { addDays, dayMonth, dayMonthShort, type Loc } from "../../lib/dates";

const AMOCRM_KEY = "procell-amocrm";

interface AmoConfig {
  enabled: boolean;
  webhookUrl: string;
  apiKey: string;
}

const DEFAULT_AMO: AmoConfig = { enabled: false, webhookUrl: "", apiKey: "" };

// Sozlama brauzerda ham saqlanadi — sahifa qayta ochilganda maydonlar to'lib tursin.
function loadAmoConfig(): AmoConfig {
  if (typeof window === "undefined") return DEFAULT_AMO;
  try {
    const raw = localStorage.getItem(AMOCRM_KEY);
    return raw ? { ...DEFAULT_AMO, ...(JSON.parse(raw) as Partial<AmoConfig>) } : DEFAULT_AMO;
  } catch {
    return DEFAULT_AMO;
  }
}

type TestStatus = "idle" | "sending" | "ok" | "err";

export function AmoCrmPage() {
  const t = usePT();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const [cfg, setCfg] = useState<AmoConfig>(loadAmoConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<{ status: TestStatus; msg: string }>({ status: "idle", msg: "" });
  const [backendConnected, setBackendConnected] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const refreshBackendStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const status = await getCrmStatus();
      setBackendConnected(Boolean(status.connected));
      return Boolean(status.connected);
    } catch {
      setBackendConnected(false);
      return false;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void refreshBackendStatus(), 0);
    return () => window.clearTimeout(id);
  }, [refreshBackendStatus]);

  function persistConfig(next: AmoConfig) {
    setCfg(next);
    try {
      localStorage.setItem(AMOCRM_KEY, JSON.stringify(next));
    } catch {
      // localStorage ishlamasa — e'tiborsiz
    }
  }

  function update<K extends keyof AmoConfig>(key: K, val: AmoConfig[K]) {
    setCfg((c) => ({ ...c, [key]: val }));
    setSaved(false);
    setTest({ status: "idle", msg: "" });
  }

  async function save(e: SyntheticEvent) {
    e.preventDefault();
    const webhook = cfg.webhookUrl.trim();
    const apiKey = cfg.apiKey.trim();
    if (!/^https?:\/\/\S+$/i.test(webhook)) {
      setTest({ status: "err", msg: t("amo.err.webhook") });
      setSaved(false);
      return;
    }
    if (!apiKey) {
      setTest({ status: "err", msg: t("amo.err.key") });
      setSaved(false);
      return;
    }
    setSaving(true);
    setTest({ status: "sending", msg: t("amo.sending") });
    try {
      const json = await saveCrmConnection({ webhook_url: webhook, api_key: apiKey });
      if (!json.success) {
        setSaved(false);
        setTest({ status: "err", msg: json.error || t("amo.err.saveBackend") });
        return;
      }
      persistConfig(cfg);
      setSaved(true);
      const active = await refreshBackendStatus();
      setTest({ status: "ok", msg: active ? t("amo.ok.savedActive") : t("amo.ok.saved") });
    } catch {
      setSaved(false);
      setTest({ status: "err", msg: t("amo.err.saveNetwork") });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestWebhook() {
    const webhook = cfg.webhookUrl.trim();
    const apiKey = cfg.apiKey.trim();
    if (!/^https?:\/\/\S+$/i.test(webhook)) {
      setTest({ status: "err", msg: t("amo.err.webhookFirst") });
      return;
    }
    if (!apiKey) {
      setTest({ status: "err", msg: t("amo.err.keyFirst") });
      return;
    }
    // Webhook shu backendning o'ziga qarasa — haqiqiy POST yuborilmaydi
    // (backendning o'z callback endpointiga test POST 400 qaytaradi).
    try {
      if (new URL(webhook).host === new URL(API_BASE).host) {
        persistConfig({ ...cfg, enabled: true });
        setSaved(true);
        const active = await refreshBackendStatus();
        setTest({ status: "ok", msg: active ? t("amo.ok.selfActive") : t("amo.ok.self") });
        return;
      }
    } catch {
      // URL tahlili xatosi — yuqoridagi tekshiruv o'tgan
    }
    setTest({ status: "sending", msg: t("amo.sending") });
    try {
      const json = await testCrmConnection({ webhook_url: webhook, api_key: apiKey });
      if (!json.success) {
        setTest({ status: "err", msg: json.error || t("amo.err.test") });
        return;
      }
      persistConfig({ ...cfg, enabled: true });
      setSaved(true);
      const active = await refreshBackendStatus();
      setTest({ status: "ok", msg: json.message || (active ? t("amo.ok.testActive") : t("amo.ok.test")) });
    } catch {
      setTest({ status: "err", msg: t("amo.err.testNetwork") });
    }
  }

  const connected = backendConnected || (cfg.enabled && test.status === "ok");
  const stateTone = statusLoading ? "neutral" : connected ? "good" : "neutral";

  return (
    <div className="@container/amo flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("amo.eyebrow")}</span>}
        title={t("amo.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="AMO-DATE" />
            <HeaderBell />
          </>
        }
      />

      <DayStrip date={sel.date} isToday={sel.isToday} testId="AMO-DAY" />

      <div className="flex flex-col gap-4 @min-[1000px]/amo:flex-row @min-[1000px]/amo:items-start">
        {/* ---- Holat + oqim ---- */}
        <div className="flex min-w-0 flex-col gap-4 @min-[1000px]/amo:flex-[1_1_0]">
          <Card pad="lg">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-pn-accent text-pn-accent-ink"><Icon name="plug" size={24} /></span>
              <div className="min-w-0">
                <h2 className="pn-card-title">{t("amo.hero")}</h2>
                <p className="pn-card-sub leading-relaxed">{t("amo.heroSub")}</p>
                <StatusPill tone={stateTone} className={`mt-3 ${statusLoading ? "animate-pulse" : ""}`} testId="AMO-STATE">
                  {statusLoading ? t("amo.state.checking") : connected ? t("amo.state.on") : t("amo.state.off")}
                </StatusPill>
              </div>
            </div>
            <p className="pn-section-label mt-6 text-pn-muted">{t("amo.flow")}</p>
            <ol className="mt-3 flex flex-col gap-2">
              <FlowStep n={1} icon="phone" title={t("amo.step1")} text={t("amo.step1Text")} color="var(--pn-sky)" />
              <FlowStep n={2} icon="sparkle" title={t("amo.step2")} text={t("amo.step2Text")} color="var(--pn-lilac)" />
              <FlowStep n={3} icon="check" title={t("amo.step3")} text={t("amo.step3Text")} color="var(--pn-peach)" />
            </ol>
          </Card>
          <FlowHistory date={sel.date} today={sel.today} onPick={sel.setDate} />
        </div>

        {/* ---- Sozlamalar ---- */}
        <Card pad="lg" className="min-w-0 @min-[1000px]/amo:flex-[1.2_1_0]">
          <h2 className="pn-card-title">{t("amo.settings")}</h2>
          <p className="pn-card-sub">{t("amo.settingsSub")}</p>
          <form onSubmit={save} className="mt-6 flex flex-col gap-5" noValidate>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-pn-border-2 bg-pn-field px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-pn-good-tint text-pn-good-text"><Icon name="shieldCheck" size={16} /></span>
                <span>
                  <span className="block text-[14px] font-semibold text-pn-text">{t("amo.live")}</span>
                  <span className="block text-[12px] text-pn-muted">{t("amo.liveHint")}</span>
                </span>
              </span>
              <Switch checked={cfg.enabled} onChange={(v) => update("enabled", v)} label={t("amo.live")} testId="AMO-ENABLED" />
            </div>

            <Field label={t("amo.f.webhook")} icon="link">
              {(id) => (
                <TextInput id={id} type="url" value={cfg.webhookUrl} onChange={(e) => update("webhookUrl", e.target.value)} placeholder="https://pbx.example.com/webhook/abc123" mono data-testid="AMO-WEBHOOK" />
              )}
            </Field>
            <Field label={t("amo.f.key")} icon="lock">
              {(id) => (
                <TextInput
                  id={id}
                  type={showKey ? "text" : "password"}
                  value={cfg.apiKey}
                  onChange={(e) => update("apiKey", e.target.value)}
                  placeholder="********"
                  autoComplete="off"
                  mono
                  data-testid="AMO-KEY"
                  right={
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      aria-label={showKey ? t("sm.f.hidePw") : t("sm.f.showPw")}
                      className="pn-press grid h-[38px] w-[38px] place-items-center rounded-full text-pn-subtle hover:bg-pn-panel-2 hover:text-pn-text"
                    >
                      <Icon name={showKey ? "eyeOff" : "eye"} size={15} />
                    </button>
                  }
                />
              )}
            </Field>

            {test.status !== "idle" && (
              <Notice tone={test.status === "ok" ? "good" : test.status === "err" ? "bad" : "neutral"} busy={test.status === "sending"} testId="AMO-MSG">
                {test.msg}
              </Notice>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-pn-border pt-5">
              {saved && (
                <span className="mr-auto flex items-center gap-[6px] text-[13px] font-medium text-pn-good-text"><Icon name="check" size={15} /> {t("amo.saved")}</span>
              )}
              <Button variant="outline" icon={test.status === "sending" ? undefined : "sparkle"} loading={test.status === "sending" && !saving} disabled={test.status === "sending" || saving} onClick={() => void sendTestWebhook()} testId="AMO-TEST">
                {t("amo.test")}
              </Button>
              <Button variant="primary" type="submit" icon={saving ? undefined : "check"} loading={saving} disabled={saving || test.status === "sending"} testId="AMO-SAVE">
                {t("amo.save")}
              </Button>
            </div>

            {connected && <Notice tone="good">{t("amo.connectedNote")}</Notice>}

            <p className="rounded-2xl border border-dashed border-pn-border-3 px-4 py-3 text-[12px] leading-relaxed text-pn-muted">
              <b className="text-pn-text-2">{t("amo.noteTitle")}</b> {t("amo.note")}{" "}
              <code className="pn-mono">POST /crm/connect-simple</code>, <code className="pn-mono">POST /crm/test-connection</code>, <code className="pn-mono">GET /crm/webhook/pbx</code>.
            </p>
          </form>
        </Card>
      </div>

      <CrmIntegrationsCard />

      <TelegramReportCard />

      <CrmManagersCard />
    </div>
  );
}

function FlowStep({ n, icon, title, text, color }: { n: number; icon: IconName; title: string; text: string; color: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-pn-panel-2 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-pn-pastel-ink" style={{ background: color }}><Icon name={icon} size={16} /></span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="pn-mono text-[11px] text-pn-subtle">0{n}</span>
          <span className="text-[14px] font-semibold text-pn-text">{title}</span>
        </span>
        <span className="mt-[2px] block text-[12px] leading-relaxed text-pn-muted">{text}</span>
      </span>
    </li>
  );
}

/* Oxirgi 14 kun: integratsiya orqali kelgan qo'ng'iroqlar (tanlangan kun bilan tugaydi). */
function FlowHistory({ date, today, onPick }: { date: string; today: string; onPick: (d: string) => void }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const { data } = useCallDays();
  const first = data?.firstDay ?? null;
  const list = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13)).filter((d) => !first || d >= first);
  const counts = list.map((d) => data?.counts.get(d) ?? 0);
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <Card data-testid="AMO-FLOW">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="pn-card-title">{t("amo.history")}</h2>
        <span className="text-[13px] text-pn-muted">{t("amo.historySum", { n: fmtInt(total) })}</span>
      </div>
      <div className="mt-4 flex h-[120px] items-end gap-[6px]" role="list" aria-label={t("amo.history")}>
        {list.map((d, i) => {
          const c = counts[i];
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              role="listitem"
              onClick={() => onPick(d)}
              title={`${dayMonth(loc, d)} — ${t("date.callsOnDay", { n: fmtInt(c) })}`}
              aria-label={`${dayMonth(loc, d)} — ${t("date.callsOnDay", { n: fmtInt(c) })}`}
              aria-current={active ? "date" : undefined}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[6px]"
            >
              <span
                className={`w-full rounded-[6px] transition-colors ${active ? "bg-pn-accent" : c ? "bg-pn-bar-dim group-hover:bg-pn-text-3" : "bg-pn-panel-3"}`}
                style={{ height: `${Math.max(4, (c / max) * 100)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-pn-subtle">
        <span>{list[0] ? dayMonthShort(loc, list[0]) : ""}</span>
        <span>{date === today ? t("date.today") : dayMonthShort(loc, date)}</span>
      </div>
    </Card>
  );
}
