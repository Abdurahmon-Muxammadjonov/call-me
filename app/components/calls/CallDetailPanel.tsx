"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../../lib/i18n";
import { getCall, type CallDetail } from "../../lib/calls";
import { AudioPlayer } from "./AudioPlayer";
import { ScoreBadge, fmtClock, fmtMoney, gradeOf, scriptNameOf, toTen } from "./primitives";

/* =====================================================================
 * O'ng tomondan ochiladigan qo'ng'iroq paneli.
 *
 * Ekran kengligiga qarab uchta ko'rinish (CSS bilan, JS o'lchovsiz):
 *   ≥1280px — jadval yonida turadi, uni yopmaydi (qoplama yo'q)
 *   768–1280px — jadval ustida, orqasida qoplama
 *   <768px — pastdan chiqadigan to'liq ekranli oyna (Capacitor uchun)
 * ===================================================================== */

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", day: "2-digit", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day}, ${time}`;
}

function Skeleton() {
  return (
    <div className="space-y-4 p-6">
      {[64, 96, 120, 180].map((h, i) => (
        <div key={i} className="animate-pulse rounded-2xl" style={{ height: h, background: "var(--divider-strong)" }} />
      ))}
    </div>
  );
}

/** Izohni "Natija / Kuchli tomoni / Yaxshilash kerak / XATOLAR" ga ajratadi. */
function parseComment(text: string) {
  const clean = String(text || "");
  const [head, ...rest] = clean.split(/XATOLAR:?/i);
  const pick = (label: string) => {
    const m = head.match(new RegExp(`${label}:\\s*([^]*?)(?=(Natija:|Kuchli tomoni:|Yaxshilash kerak:|$))`, "i"));
    return m ? m[1].trim().replace(/\s+$/, "") : "";
  };
  const mistakes = (rest.join("") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("−") || l.startsWith("-"))
    .map((l) => {
      const m = l.match(/^[−-]\s*([\d.]+)\s*·\s*(.+)$/);
      return m ? { minus: m[1], text: m[2] } : { minus: null, text: l.replace(/^[−-]\s*/, "") };
    });
  return { result: pick("Natija"), strong: pick("Kuchli tomoni"), improve: pick("Yaxshilash kerak"), mistakes };
}

function CriteriaList({ items }: { items: { title: string; score: number }[] }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);
  const done = items.filter((i) => i.score >= 80).length;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t("rec.panel.criteria")}</h3>
        <span className="font-mono text-xs tabular-nums" style={{ color: "var(--text-2)" }}>
          {done}/{items.length}
        </span>
      </div>
      <ul className="space-y-3">
        {shown.map((c) => {
          const color = c.score >= 80 ? "var(--green)" : c.score >= 50 ? "var(--amber-bar)" : "var(--orange)";
          return (
            <li key={c.title}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-sm" style={{ color: "var(--text-2)" }}>{c.title}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color }}>{c.score}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--divider-strong)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.score)}%`, background: color }} />
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-3 min-h-11 text-sm font-medium"
          style={{ color: "var(--accent-text)" }}
        >
          {all ? t("rec.panel.showLess") : t("rec.panel.showAll", { n: items.length })}
        </button>
      )}
    </section>
  );
}

function TranscriptView({ detail, onSeek }: { detail: CallDetail; onSeek: (sec: number) => void }) {
  const t = useT();
  const segments = Array.isArray(detail.transcript_segments) ? detail.transcript_segments : [];
  if (segments.length === 0) {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
        {detail.transcript || t("rec.panel.noTranscript")}
      </p>
    );
  }
  const firstSpeaker = segments.find((s) => s.speaker)?.speaker;
  return (
    <ul className="space-y-3">
      {segments.map((s, i) => {
        const isOperator = s.speaker === firstSpeaker;
        return (
          <li key={i} className={isOperator ? "pr-6" : "pl-6"}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: isOperator ? "var(--accent-text)" : "var(--subtle)" }}>
                {isOperator ? t("rec.panel.seller") : t("rec.panel.client")}
              </span>
              {typeof s.start === "number" && (
                <button
                  type="button"
                  onClick={() => onSeek(Number(s.start))}
                  className="font-mono text-xs tabular-nums underline-offset-2 hover:underline"
                  style={{ color: "var(--subtle)" }}
                >
                  {fmtClock(s.start)}
                </button>
              )}
            </div>
            <p
              className="rounded-xl px-3 py-2 text-sm leading-relaxed"
              style={{
                background: isOperator ? "var(--seg-active)" : "var(--surface-4)",
                color: "var(--text)",
              }}
            >
              {s.text}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CallDetailPanel({
  callId,
  managerName,
  onClose,
  onPrev,
  onNext,
}: {
  callId: string;
  managerName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [tab, setTab] = useState<"analysis" | "transcript">("analysis");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const audioWrapRef = useRef<HTMLDivElement | null>(null);

  /* Panel har bir qo'ng'iroq uchun key={callId} bilan qayta yaratiladi,
   * shu sabab bu yerda holatni tozalash shart emas — faqat yuklaymiz. */
  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const d = await getCall(callId, ctrl.signal);
        setDetail(d);
      } catch {
        /* bekor qilindi yoki xato — skeleton qoladi */
      }
    })();
    return () => ctrl.abort();
  }, [callId]);

  /* Esc — yopish, ↑/↓ — oldingi/keyingi qo'ng'iroq. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowUp" && onPrev) { e.preventDefault(); onPrev(); }
      else if (e.key === "ArrowDown" && onNext) { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const parsed = useMemo(() => parseComment(detail?.rop_comment || ""), [detail?.rop_comment]);
  const criteria = (detail?.criteria_scores || []).map((c) => ({ title: c.title, score: Number(c.score) || 0 }));
  const scored = (detail?.kpi_score ?? 0) > 0;
  const processing = detail?.status === "processing" || detail?.status === "queued";

  const seek = (sec: number) => {
    const el = audioWrapRef.current?.querySelector("audio");
    if (el) { el.currentTime = sec; void el.play(); }
  };

  return (
    <>
      {/* Qoplama — faqat 1280px dan tor ekranda */}
      <button
        type="button"
        aria-label={t("rec.panel.close")}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 xl:hidden"
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Qo'ng'iroq tafsiloti"
        className="fixed inset-x-0 bottom-0 top-16 z-50 flex animate-slide-up flex-col outline-none md:inset-y-0 md:left-auto md:right-0 md:w-[440px] xl:sticky xl:top-6 xl:z-0 xl:h-[calc(100vh-3rem)] xl:animate-none"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* a) Sarlavha */}
        <header className="flex items-start gap-3 p-6 pb-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            {detail?.operator_ext || "—"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold" style={{ color: "var(--text)" }}>{managerName}</p>
            {detail && (
              <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text-2)" }}>
                {detail.direction === "incoming" ? t("rec.incoming") : detail.direction === "outgoing" ? t("rec.outgoing") : "—"}
                {scriptNameOf(detail.rop_comment) ? ` · ${scriptNameOf(detail.rop_comment)}` : ""}
                {` · ${fmtWhen(detail.created_at)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("rec.panel.close")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg transition hover:opacity-80"
            style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "var(--text-2)" }}
          >
            ×
          </button>
        </header>

        {!detail ? (
          <Skeleton />
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-28">
            {/* b) Audio */}
            {detail.audio_url && (
              <div ref={audioWrapRef}>
                <AudioPlayer key={detail.id} src={detail.audio_url} callId={detail.id} />
              </div>
            )}

            {tab === "transcript" ? (
              <section>
                <button
                  type="button"
                  onClick={() => setTab("analysis")}
                  className="mb-4 min-h-11 text-sm font-medium"
                  style={{ color: "var(--accent-text)" }}
                >
                  {t("rec.panel.backToAnalysis")}
                </button>
                <TranscriptView detail={detail} onSeek={seek} />
              </section>
            ) : processing ? (
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                {t("rec.processing")}
              </p>
            ) : !scored ? (
              <section
                className="rounded-2xl p-4"
                style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {t("rec.panel.notScored", { reason: detail.dropped_reason || "—" })}
                </p>
                {detail.summary && (
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{detail.summary}</p>
                )}
              </section>
            ) : (
              <>
                {/* c) Ball */}
                <section className="flex items-end justify-between">
                  <div className="flex items-end gap-2">
                    <span className="font-mono text-[44px] font-semibold leading-none tabular-nums" style={{ color: "var(--text)" }}>
                      {toTen(detail.kpi_score)}
                    </span>
                    <span className="pb-1 text-sm" style={{ color: "var(--subtle)" }}>/ 10</span>
                    <span className="pb-1 pl-2">
                      <ScoreBadge
                        score={detail.kpi_score}
                        label={t(`rec.grade.${gradeOf(detail.kpi_score)}` as Parameters<typeof t>[0])}
                      />
                    </span>
                  </div>
                  {(detail.bonus_amount > 0 || detail.penalty_amount > 0) && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "var(--subtle)" }}>
                        {detail.bonus_amount > 0 ? t("rec.panel.bonus") : t("rec.panel.penalty")}
                      </p>
                      <p
                        className="font-mono text-sm font-semibold tabular-nums"
                        style={{ color: detail.bonus_amount > 0 ? "var(--green)" : "var(--orange)" }}
                      >
                        {detail.bonus_amount > 0
                          ? `+${fmtMoney(detail.bonus_amount)}`
                          : `−${fmtMoney(detail.penalty_amount)}`} so&apos;m
                      </p>
                    </div>
                  )}
                </section>

                <hr style={{ borderColor: "var(--divider-strong)" }} />

                {/* d) Skript bandlari */}
                {criteria.length > 0 && <CriteriaList items={criteria} />}

                {/* e) Izohlar */}
                {parsed.result && (
                  <section>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--subtle)" }}>{t("rec.panel.result")}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{parsed.result}</p>
                  </section>
                )}
                {parsed.strong && (
                  <section>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--green)" }}>{t("rec.panel.strong")}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{parsed.strong}</p>
                  </section>
                )}
                {parsed.improve && (
                  <section>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--orange)" }}>{t("rec.panel.improve")}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{parsed.improve}</p>
                  </section>
                )}
                {parsed.mistakes.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--orange)" }}>{t("rec.panel.mistakes")}</h4>
                    <ul className="space-y-1.5">
                      {parsed.mistakes.map((m, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: "var(--orange)" }}>
                          {m.minus && (
                            <span className="shrink-0 font-mono text-xs tabular-nums">−{t("rec.panel.points", { n: m.minus })}</span>
                          )}
                          <span>{m.text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* f) Pastki tugmalar */}
        {detail && tab === "analysis" && (
          <div
            className="sticky bottom-0 flex gap-2 p-4"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
          >
            <a
              href={`/dashboard/deep-audit?call=${detail.id}`}
              className="grid min-h-11 flex-1 place-items-center rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              {t("rec.panel.deepAudit")}
            </a>
            <button
              type="button"
              onClick={() => setTab("transcript")}
              className="min-h-11 flex-1 rounded-xl text-sm font-medium transition hover:opacity-80"
              style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "var(--text)" }}
            >
              {t("rec.panel.transcript")}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
