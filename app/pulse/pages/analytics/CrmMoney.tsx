"use client";

/* CRM: TO'LOVLAR — Dashboard ichida (2026-10-20, foydalanuvchi talabi:
 * "CRM'ni ulab, ichidagi pul ma'lumotlarini olish"). Davr — Analitikaning
 * tanlangan oralig'i. Manba — amoCRM (backend lib/crmDeals.ts, har 10
 * daqiqada yangilanadi): to'langan summa, to'liq (chek tekshirilgan) / chek
 * kutilmoqda / qisman, qarzdorlik, operator va CRM menejeri kesimi. */

import Link from "next/link";
import { useLocale } from "../../../lib/i18n";
import { usePT, type PT } from "../../i18n";
import { Button, Card, ExtBadge, Skeleton, StatusPill } from "../../ui/primitives";
import { useCrmMoney, useCrmSync, type CrmLead, type PayKind } from "../../data/crmMoney";
import { TONE_VARS, type Tone } from "../../lib/tones";
import { fmtInt } from "../../lib/format";
import { dayMonth, hmOf, type Loc } from "../../lib/dates";

const KIND_TONE: Record<PayKind, Tone> = { full: "good", pending: "warn", partial: "neutral" };

/* 766 221 975 → "766,2 mln" (plitkalar uchun); ro'yxatda to'liq raqam. */
function short(t: PT, v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} ${t("cm.bn")}`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")} ${t("cm.mn")}`;
  return fmtInt(v);
}

function Stat({ label, value, sub, tone, testId }: { label: string; value: string; sub: string; tone?: Tone; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-pn-panel-2 px-4 py-3" data-testid={testId}>
      <span className="truncate text-[12px] text-pn-muted">{label}</span>
      <span className="pn-mono truncate text-[22px] font-semibold leading-tight" style={tone ? { color: TONE_VARS[tone].text } : undefined}>{value}</span>
      <span className="truncate text-[12px] text-pn-subtle">{sub}</span>
    </div>
  );
}

function LeadItem({ l, t, loc, debt }: { l: CrmLead; t: PT; loc: Loc; debt?: boolean }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[13px]">
        <span className="min-w-0 flex-1 truncate font-semibold">{l.name || `#${l.lead_id}`}</span>
        <span className="pn-mono shrink-0" style={{ color: debt ? TONE_VARS.bad.text : undefined }}>
          {fmtInt(debt ? l.debt : l.paid)} {t("cm.som")}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-pn-muted">
        <StatusPill tone={KIND_TONE[l.kind]} plain>{l.stage ?? t(`cm.k.${l.kind}`)}</StatusPill>
        {l.at && <span className="pn-mono text-pn-subtle">{dayMonth(loc, l.at.slice(0, 10))} {hmOf(new Date(l.at))}</span>}
        {l.operator && <span>{l.operator}</span>}
        {!l.operator && l.manager && <span>{l.manager}</span>}
        {debt && l.deal_sum > 0 && <span className="pn-mono">{t("cm.ofDeal", { s: fmtInt(l.deal_sum) })}</span>}
      </span>
    </>
  );
  const cls = "pn-press flex flex-col gap-1 rounded-2xl border border-pn-border-2 px-4 py-3 hover:border-pn-border-3";
  return l.url ? (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function CrmMoneyCard({ from, to, canAdmin }: { from: string; to: string; canAdmin: boolean }) {
  const t = usePT();
  const loc = useLocale() as Loc;
  const q = useCrmMoney(from, to);
  const sync = useCrmSync();
  const d = q.data;
  const live = d && d.ready && d.connected ? d : null;

  return (
    <Card pad="none" className="@container/cm overflow-hidden" data-testid="AN-CRM">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-[22px] pb-4">
        <div>
          <h2 className="pn-card-title">{t("cm.title")}</h2>
          <p className="pn-card-sub">
            {from === to ? dayMonth(loc, from) : `${dayMonth(loc, from)} – ${dayMonth(loc, to)}`} · {t("cm.sub")}
            {live?.pull_at && ` · ${t("cm.updated", { t: hmOf(new Date(live.pull_at)) })}`}
          </p>
        </div>
        {live && canAdmin && (
          <Button variant="outline" compact icon="refresh" loading={sync.isPending} onClick={() => sync.mutate()} testId="AN-CRM-sync">
            {sync.isSuccess ? t("cm.syncing") : t("cm.sync")}
          </Button>
        )}
      </div>

      {q.isPending ? (
        <div className="px-6 pb-6"><Skeleton h={180} r={18} /></div>
      ) : q.isError || !d ? (
        <div className="px-6 pb-6 text-[14px] text-pn-muted">{t("cm.error")}</div>
      ) : !d.ready ? (
        <div className="px-6 pb-6 text-[14px] text-pn-muted">{t("cm.notReady")}</div>
      ) : !d.connected ? (
        <div className="flex flex-wrap items-center gap-3 px-6 pb-6 text-[14px] text-pn-muted">
          {t("cm.notConnected")}
          {canAdmin && <Link href="/dashboard/amocrm" className="font-semibold text-pn-accent-strong underline-offset-2 hover:underline">{t("cm.connect")}</Link>}
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6 pb-6">
          {d.pull_error && (
            <p className="rounded-2xl px-4 py-3 text-[13px]" style={{ background: TONE_VARS.bad.tint, color: TONE_VARS.bad.text }}>
              {t("cm.pullError")}: {d.pull_error}
            </p>
          )}
          {!d.pull_at && !d.pull_error && <p className="text-[13px] text-pn-muted">{t("cm.firstSync")}</p>}

          <div className="grid grid-cols-2 gap-3 @min-[760px]/cm:grid-cols-3 @min-[1100px]/cm:grid-cols-5">
            <Stat testId="AN-CRM-paid" label={t("cm.paid")} value={short(t, d.totals.paid)} sub={t("cm.deals", { n: fmtInt(d.totals.deals) })} />
            <Stat testId="AN-CRM-full" tone="good" label={t("cm.k.full")} value={short(t, d.totals.full.sum)} sub={t("cm.fullSub", { n: fmtInt(d.totals.full.count) })} />
            <Stat testId="AN-CRM-pending" tone="warn" label={t("cm.k.pending")} value={short(t, d.totals.pending.sum)} sub={t("cm.deals", { n: fmtInt(d.totals.pending.count) })} />
            <Stat testId="AN-CRM-partial" label={t("cm.k.partial")} value={short(t, d.totals.partial.sum)} sub={t("cm.deals", { n: fmtInt(d.totals.partial.count) })} />
            <Stat testId="AN-CRM-debt" tone="bad" label={t("cm.debtAll")} value={short(t, d.debt_all.sum)} sub={t("cm.debtors", { n: fmtInt(d.debt_all.count) })} />
          </div>

          {d.totals.deals === 0 ? (
            <p className="text-[14px] text-pn-muted">{t("cm.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 @min-[900px]/cm:grid-cols-2">
              <div>
                <p className="pn-section-label mb-3 text-pn-muted">{t("cm.byOperator")}</p>
                <ul className="flex flex-col gap-2">
                  {d.operators.slice(0, 10).map((o) => (
                    <li key={o.ext ?? o.name} className="flex items-center gap-3 rounded-2xl bg-pn-panel-2 px-3 py-2">
                      {o.ext && <ExtBadge size="audio">{o.ext}</ExtBadge>}
                      <span className="min-w-0 flex-1 truncate text-[13px]">{o.ext ? o.name : t("cm.noCall")}</span>
                      <span className="pn-mono shrink-0 text-[12px] text-pn-muted">{t("cm.dealsShort", { n: o.count, f: o.full })}</span>
                      <span className="pn-mono w-24 shrink-0 text-right text-[13px]">{short(t, o.paid)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="pn-section-label mb-3 text-pn-muted">{t("cm.byManager")}</p>
                <ul className="flex flex-col gap-2">
                  {d.managers.slice(0, 10).map((m) => (
                    <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-pn-panel-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px]">{m.name}</span>
                      <span className="pn-mono shrink-0 text-[12px] text-pn-muted">{t("cm.dealsShort", { n: m.count, f: m.full })}</span>
                      <span className="pn-mono w-24 shrink-0 text-right text-[13px]">{short(t, m.paid)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {d.payment_types.length > 0 && (
            <div>
              <p className="pn-section-label mb-3 text-pn-muted">{t("cm.payTypes")}</p>
              <div className="flex flex-wrap gap-2">
                {d.payment_types.map((p) => (
                  <span key={p.type} className="pn-mono rounded-full bg-pn-panel-2 px-3 py-1 text-[12px]">
                    {p.type} · {p.count} · {short(t, p.sum)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 @min-[900px]/cm:grid-cols-2">
            <div>
              <p className="pn-section-label mb-3 text-pn-muted">{t("cm.recent")}</p>
              {d.recent.length === 0 ? (
                <p className="text-[13px] text-pn-muted">{t("cm.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {d.recent.slice(0, 8).map((l) => <li key={l.lead_id}><LeadItem l={l} t={t} loc={loc} /></li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="pn-section-label mb-3 text-pn-muted">{t("cm.topDebt")}</p>
              {d.debt_all.top.length === 0 ? (
                <p className="text-[13px] text-pn-muted">{t("cm.noDebt")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {d.debt_all.top.slice(0, 8).map((l) => <li key={l.lead_id}><LeadItem l={l} t={t} loc={loc} debt /></li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
