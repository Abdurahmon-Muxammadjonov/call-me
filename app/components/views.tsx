"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent, type ReactNode } from "react";
import { Icons, type IconKey } from "./Icons";
import { fetchCallAnalytics, formatDuration, API_BASE } from "../lib/api";
import {
  listManagers,
  getManagerStats,
  listCalls,
  getCall,
  analyzeCall,
  analyzeCallFile,
  formatUZS,
  formatDateTime,
  formatSeconds,
  type Manager,
  type ManagerStats,
  type CallRow,
  type CallDetail,
  type AnalyzeResult,
} from "../lib/calls";
import {
  listCriteria,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  deriveCategories,
  categoryNames,
  type Criterion,
  type NewCriterion,
  type CriterionType,
  type CriteriaCategory,
} from "../lib/criteria";
import {
  Card,
  SectionTitle,
  Sparkline,
  ScoreBar,
  PillButton,
  Skeleton,
  ConfirmModal,
  Logo,
  scoreColor,
  scoreAccent,
  accentText,
  accentGrad,
  accentGlow,
  type Accent,
} from "./ui";
import { STATS } from "../lib/data";

/* Relaxed shape so live values (computed from the backend) can replace the
 * template values without TS narrowing each card to its literal accent/trend. */
type StatItem = {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: Accent;
  icon: string;
  spark: number[];
};

/* Small reusable empty-state line. */
function Empty({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{text}</div>
  );
}

/* ============================ STAT WIDGETS ============================ */
function StatCard({ stat }: { stat: StatItem }) {
  const accent = stat.accent as Accent;
  const Icon = Icons[stat.icon as keyof typeof Icons];
  const TrendIcon = stat.trend === "up" ? Icons.arrowUp : Icons.arrowDown;
  return (
    <Card hover className={`p-5 ${accentGlow[accent]}`}>
      <div className="flex items-start justify-between">
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br ${accentGrad[accent]} text-white shadow-md`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            stat.trend === "up"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {stat.delta}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
        {stat.value}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
      <div className="mt-3">
        <Sparkline data={stat.spark} accent={accent} />
      </div>
    </Card>
  );
}

export function StatGrid({ stats = STATS }: { stats?: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.key} stat={s} />
      ))}
    </div>
  );
}

/* ============================ OVERVIEW ============================ */
const LOST_PALETTE = [
  "from-rose-400 to-pink-400",
  "from-amber-400 to-orange-400",
  "from-cyan-400 to-sky-400",
  "from-violet-400 to-fuchsia-400",
  "from-emerald-400 to-teal-400",
];

interface LostBar { label: string; count: number; pct: number }

export function OverviewView() {
  // Hammasi backenddan jonli: KPI cardlar, top operatorlar, yo'qotish sabablari
  // va so'nggi faollik. Demo qiymat yo'q — ma'lumot bo'lmasa bo'sh holat.
  const [stats, setStats] = useState<StatItem[]>(STATS);
  const [live, setLive] = useState<"loading" | "online" | "offline">("loading");
  const [leaders, setLeaders] = useState<ManagerStats[]>([]);
  const [lost, setLost] = useState<LostBar[]>([]);
  const [recent, setRecent] = useState<CallRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      // Qo'ng'iroqlar jurnali — KPI o'rtachasi va so'nggi faollik shu yerdan.
      try {
        const [calls, mgrs, analytics] = await Promise.all([
          listCalls({ limit: 100 }, ctrl.signal),
          listManagers(ctrl.signal),
          fetchCallAnalytics(ctrl.signal).catch(() => null),
        ]);

        const nameMap = Object.fromEntries(mgrs.map((m) => [m.id, m.name]));
        setNames(nameMap);
        setRecent(calls.slice(0, 6));

        const totalCalls = analytics?.totalCalls ?? calls.length;
        const avgDuration = analytics?.averageDurationSeconds
          ?? (calls.length ? calls.reduce((s, c) => s + (c.duration || 0), 0) / calls.length : 0);
        const avgKpi = calls.length
          ? calls.reduce((s, c) => s + (Number(c.kpi_score) || 0), 0) / calls.length
          : 0;

        setStats(
          STATS.map((s) => {
            if (s.key === "calls") return { ...s, value: totalCalls.toLocaleString(), delta: "Jonli" };
            if (s.key === "duration") return { ...s, value: formatDuration(Math.round(avgDuration)), delta: "Jonli" };
            if (s.key === "score") return { ...s, value: avgKpi ? avgKpi.toFixed(1) : "—", delta: "Jonli" };
            // Gemini token xarajati — backend hali bu ko'rsatkichni bermaydi.
            if (s.key === "tokens") return { ...s, value: "—", delta: "Ulanmagan" };
            return s;
          })
        );

        // Yo'qotish sabablari taqsimoti (analytics.lostReasonsSummary).
        if (analytics) {
          const entries = Object.entries(analytics.lostReasonsSummary);
          const totalLost = entries.reduce((s, [, n]) => s + n, 0);
          setLost(
            entries
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([label, count]) => ({
                label,
                count,
                pct: totalLost ? Math.round((count / totalLost) * 100) : 0,
              }))
          );
        }
        setLive("online");
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setLive("offline");
      }

      // Top operatorlar — har menejer bo'yicha yig'ma statistika.
      try {
        const mgrs = await listManagers(ctrl.signal);
        const allStats = await Promise.all(
          mgrs.map((m) => getManagerStats(m.id, ctrl.signal).catch(() => null))
        );
        setLeaders(
          allStats
            .filter((s): s is ManagerStats => !!s)
            .sort((a, b) => b.avg_kpi_score - a.avg_kpi_score)
            .slice(0, 5)
        );
      } catch {
        /* leaderboard ixtiyoriy — xato bo'lsa bo'sh qoladi */
      }
    })();
    return () => ctrl.abort();
  }, []);

  const nameOf = (id: string) => names[id] || `${id.slice(0, 8)}…`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset ${
            live === "online"
              ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
              : live === "offline"
              ? "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400"
              : "bg-slate-500/10 text-slate-500 ring-slate-500/30"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full bg-current ${live === "online" ? "animate-pulse" : ""}`} />
          {live === "online"
            ? "Backend ulangan · jonli ma'lumot"
            : live === "offline"
            ? "Backend oflayn"
            : "Backend bilan ulanmoqda..."}
        </span>
      </div>

      <StatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top operatorlar (leaderboard) */}
        <Card className="p-6 lg:col-span-2">
          <SectionTitle title="Top operatorlar" subtitle="O'rtacha KPI baho bo'yicha (jonli)" />
          {leaders.length === 0 ? (
            <Empty text="Hozircha statistika yo'q — birinchi qo'ng'iroq tahlilidan keyin paydo bo'ladi." />
          ) : (
            <ul className="space-y-3">
              {leaders.map((l, i) => (
                <li key={l.manager.id} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/40 p-3 dark:border-slate-700/50 dark:bg-slate-800/30">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br ${accentGrad[scoreAccent(l.avg_kpi_score)]} text-xs font-bold text-white`}>
                    {l.manager.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{l.manager.name}</p>
                    <p className="text-xs text-slate-400">{l.total_calls} qo&apos;ng&apos;iroq · {formatUZS(l.total_penalty)} jarima</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="mb-1 flex justify-end">
                      <span className={`text-sm font-bold ${scoreColor(l.avg_kpi_score)}`}>{l.avg_kpi_score.toFixed(1)}</span>
                    </div>
                    <ScoreBar score={l.avg_kpi_score} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Yo'qotish sabablari taqsimoti */}
        <Card className="p-6">
          <SectionTitle title="Yo'qotish sabablari" subtitle="Eng ko'p uchragan (jonli)" />
          {lost.length === 0 ? (
            <Empty text="Yo'qotish sabablari hali aniqlanmagan." />
          ) : (
            <div className="space-y-5">
              {lost.map((d, i) => (
                <div key={d.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-slate-600 dark:text-slate-300">{d.label}</span>
                    <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">{d.pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
                    <div
                      className={`h-full rounded-full bg-linear-to-r ${LOST_PALETTE[i % LOST_PALETTE.length]} transition-all duration-700`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* So'nggi faollik */}
      <Card className="p-6">
        <SectionTitle title="So'nggi faollik" subtitle="Eng oxirgi tahlil qilingan qo'ng'iroqlar" />
        {recent.length === 0 ? (
          <Empty text="Hali tahlil qilingan qo'ng'iroqlar yo'q." />
        ) : (
          <ul className="space-y-4">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br ${accentGrad[scoreAccent(c.kpi_score)]} text-xs font-bold text-white`}>
                  {nameOf(c.manager_id).split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{nameOf(c.manager_id)}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(c.created_at)} · {formatSeconds(c.duration)}</p>
                </div>
                <span className={`text-sm font-bold ${scoreColor(c.kpi_score)}`}>{Math.round(c.kpi_score)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ============================ RECORDINGS ============================ */
export function RecordingsView() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [managers, setManagers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mgrFilter, setMgrFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [rows, mgrs] = await Promise.all([
          listCalls({ limit: 100 }, ctrl.signal),
          listManagers(ctrl.signal).catch(() => [] as Manager[]),
        ]);
        setCalls(rows);
        setManagers(Object.fromEntries(mgrs.map((m) => [m.id, m.name])));
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError")
          setError("Qo'ng'iroqlar jurnalini olishda xatolik. Backend (:5001) ishlayotganini tekshiring.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const nameOf = (id: string) => managers[id] || `${id.slice(0, 8)}…`;
  // O'chirilgan operatorlarning qo'ng'iroqlarini ko'rsatmaymiz: menejerlar
  // ro'yxati bo'lsa, faqat mavjud (yoki menejersiz/test) qo'ng'iroqlar qoladi.
  // Dinamik — operator o'chirilsa, uning yozuvlari avtomatik yo'qoladi.
  const haveManagers = Object.keys(managers).length > 0;
  let visible = haveManagers ? calls.filter((c) => !c.manager_id || managers[c.manager_id]) : calls;
  if (mgrFilter) visible = visible.filter((c) => c.manager_id === mgrFilter);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? visible.filter((c) => nameOf(c.manager_id).toLowerCase().includes(q) || c.rop_comment.toLowerCase().includes(q))
    : visible;
  // Faqat qo'ng'irog'i bor operatorlar (jonli) — filtr ro'yxati uchun.
  const operatorOptions = Object.entries(managers).filter(([id]) => calls.some((c) => c.manager_id === id));

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6">
          <SectionTitle
            title="Audio yozuvlar"
            subtitle="Backenddan jonli yuklangan qo'ng'iroqlar jurnali"
            action={
              <div className="flex items-center gap-2">
                {operatorOptions.length > 0 && (
                  <select
                    value={mgrFilter}
                    onChange={(e) => setMgrFilter(e.target.value)}
                    className="rounded-xl border border-slate-200/70 bg-white/60 py-2 pl-3 pr-8 text-sm text-slate-600 outline-none transition focus:border-indigo-400 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200"
                    title="Operator bo'yicha filtr"
                  >
                    <option value="">Barcha operatorlar</option>
                    {operatorOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                )}
                <div className="relative">
                  <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Menejer yoki izoh..."
                    className="w-44 rounded-xl border border-slate-200/70 bg-white/60 py-2 pl-9 pr-3 text-sm outline-none transition focus:w-56 focus:border-indigo-400 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>
              </div>
            }
          />
        </div>

        {error && (
          <div className="mx-6 mb-4 flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            <Icons.close className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200/60 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-700/50">
                <th className="px-6 py-3 font-semibold">Menejer</th>
                <th className="px-6 py-3 font-semibold">Sana / vaqt</th>
                <th className="px-6 py-3 font-semibold">Davomiylik</th>
                <th className="px-6 py-3 font-semibold">KPI baho</th>
                <th className="px-6 py-3 font-semibold">Jarima</th>
                <th className="px-6 py-3 font-semibold">Bonus</th>
                <th className="px-6 py-3 font-semibold text-right">Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100/60 dark:border-slate-800/40">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setOpenId(c.id)}
                    className="cursor-pointer border-b border-slate-100/60 transition-colors hover:bg-indigo-500/5 dark:border-slate-800/40 dark:hover:bg-cyan-500/5"
                  >
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{nameOf(c.manager_id)}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDateTime(c.created_at)}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{formatSeconds(c.duration)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 font-bold ${scoreColor(c.kpi_score)}`}>{Math.round(c.kpi_score)}</span>
                        <div className="w-20"><ScoreBar score={c.kpi_score} /></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-rose-500">{c.penalty_amount ? `−${formatUZS(c.penalty_amount)}` : "—"}</td>
                    <td className="px-6 py-4 font-medium text-emerald-500">{c.bonus_amount ? `+${formatUZS(c.bonus_amount)}` : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-500 dark:text-cyan-400">
                        <Icons.scan className="h-3.5 w-3.5" /> Ko&apos;rish
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {calls.length === 0
              ? "Hozircha tahlil qilingan qo'ng'iroqlar yo'q. «Audio yuklash» orqali birinchi tahlilni boshlang."
              : "Qidiruv bo'yicha natija topilmadi."}
          </div>
        )}
      </Card>

      {openId && (
        <CallDetailModal
          key={openId}
          id={openId}
          managerName={nameOf(calls.find((c) => c.id === openId)?.manager_id ?? "")}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

/* Split-pane modal: chap tomonda metrikalar/lost reasons, o'ng tomonda ROP
 * izohi. Bitta qo'ng'iroq backenddan to'liq (GET /api/calls/:id) olinadi. */
function CallDetailModal({ id, managerName, onClose }: { id: string; managerName: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realDur, setRealDur] = useState<number | null>(null);

  // Mounted fresh per call (keyed by id in the parent), so all state is set
  // only after the await — no synchronous setState cascade inside the effect.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setDetail(await getCall(id, ctrl.signal));
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setError("Qo'ng'iroq tafsilotini olishda xatolik.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-white/90 shadow-2xl backdrop-blur-xl dark:bg-slate-900/90 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-slate-700/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Qo&apos;ng&apos;iroq tahlili</h3>
            <p className="text-xs text-slate-400">{managerName}{detail ? ` · ${formatDateTime(detail.created_at)}` : ""}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 p-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>
        ) : error ? (
          <div className="flex items-center gap-2.5 m-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            <Icons.close className="h-4 w-4 shrink-0" /> {error}
          </div>
        ) : detail ? (
          <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2">
            {/* Chap: ko'rsatkichlar */}
            <div className="space-y-5 border-slate-200/60 p-6 dark:border-slate-700/50 md:border-r">
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="KPI" value={String(Math.round(detail.kpi_score))} cls={scoreColor(detail.kpi_score)} />
                <StatBox label="Davomiylik" value={formatSeconds(realDur ?? detail.duration)} />
                <StatBox label="Jarima" value={detail.penalty_amount ? formatUZS(detail.penalty_amount) : "0"} cls="text-rose-500" />
              </div>

              {detail.audio_url && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Qayta eshitish</p>
                  <AudioPlayer src={detail.audio_url} onDuration={setRealDur} />
                </div>
              )}

              {detail.conversions && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Konversiya</p>
                  <div className="space-y-2.5">
                    <LabeledBar label="Traffik konversiya" pct={detail.conversions.traffic_conversion} />
                    <LabeledBar label="Sotuv konversiya" pct={detail.conversions.sales_conversion} />
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Yo&apos;qotish sabablari</p>
                {detail.lost_reasons.length === 0 ? (
                  <p className="text-sm text-slate-400">Aniqlanmagan.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.lost_reasons.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-rose-500/5 px-3 py-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{r.reason_text}</span>
                        <span className="shrink-0 font-semibold text-rose-500">×{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* O'ng: ROP izohi */}
            <div className="flex flex-col gap-3 bg-slate-50/60 p-6 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white"><Icons.spark className="h-4 w-4" /></span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">ROP Izohi (AI auditor)</p>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {detail.rop_comment || "Izoh berilmagan."}
              </p>
              {detail.bonus_amount > 0 && (
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Icons.check className="h-3.5 w-3.5" /> Bonus: {formatUZS(detail.bonus_amount)}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatBox({ label, value, cls = "text-slate-800 dark:text-white" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/40 p-3 text-center dark:border-slate-700/50 dark:bg-slate-800/30">
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function LabeledBar({ label, pct }: { label: string; pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{v.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
        <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/* ---------- Audio player (qayta eshitish) ----------
 * Qo'ng'iroq audiosini platforma ichida tinglash uchun. `onDuration` orqali
 * audioning HAQIQIY davomiyligini (metadata'dan) tashqariga beradi — backenddagi
 * noto'g'ri saqlangan duration o'rniga shuni ko'rsatish mumkin. */
function AudioPlayer({ src, onDuration }: { src: string; onDuration?: (sec: number) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  }
  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCur(a.currentTime);
  }
  function cycleRate() {
    const steps = [1, 1.25, 1.5, 2, 0.75];
    const next = steps[(steps.indexOf(rate) + 1) % steps.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  if (failed) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">
        <Icons.close className="h-4 w-4 shrink-0" />
        Audioni ijro etib bo&apos;lmadi (havola yaroqsiz yoki ruxsat yo&apos;q).
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/50 p-3 dark:border-slate-700/50 dark:bg-slate-800/40">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) { setDur(d); onDuration?.(d); }
        }}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        onClick={toggle}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 to-cyan-400 text-white shadow-md transition hover:scale-105"
        title={playing ? "Pauza" : "Eshitish"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <Icons.play className="h-5 w-5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={dur || 0}
          value={cur}
          onChange={seek}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500 dark:bg-slate-700"
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-slate-400">
          <span>{formatSeconds(cur)}</span>
          <span>{dur ? formatSeconds(dur) : "—:—"}</span>
        </div>
      </div>
      <button
        onClick={cycleRate}
        className="shrink-0 rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-500/10 dark:border-slate-700/60 dark:text-slate-300"
        title="Tezlik"
      >
        {rate}×
      </button>
      <a
        href={src}
        download
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200/70 text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-600 dark:border-slate-700/60 dark:hover:text-slate-200"
        title="Yuklab olish"
      >
        <Icons.upload className="h-4 w-4 rotate-180" />
      </a>
    </div>
  );
}

/* ============================ UPLOAD ============================ */
type UploadStatus = "idle" | "analyzing" | "done" | "error";

export function UploadView() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerId, setManagerId] = useState("");
  const [mode, setMode] = useState<"url" | "file">("url");
  const [audioUrl, setAudioUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Menejerlar ro'yxati — tahlil aynan qaysi menejer nomidan yozilishini
  // tanlash uchun (backend manager_id UUID talab qiladi).
  useEffect(() => {
    const ctrl = new AbortController();
    listManagers(ctrl.signal)
      .then((list) => {
        setManagers(list);
        setManagerId((cur) => cur || list[0]?.id || "");
      })
      .catch(() => {
        /* menejerlar olinmadi — select bo'sh qoladi, foydalanuvchi xabar oladi */
      });
    return () => ctrl.abort();
  }, []);

  const isUrlValid = /^https?:\/\/\S+$/i.test(audioUrl.trim());
  const inputReady = mode === "url" ? isUrlValid : !!file;
  // Menejer (id) hozircha ixtiyoriy — tanlanmasa ham tahlil yuboriladi.
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
    } catch (err) {
      setError((err as Error).message || "Tahlil amalga oshmadi.");
      setStatus("error");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card glow className="p-8 lg:col-span-3">
        <SectionTitle title="Audio yuklash" subtitle="Qo'ng'iroqni AI auditor (Gemini) bilan tahlil qiling" />

        <form onSubmit={handleAnalyze} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Menejer <span className="font-normal normal-case text-slate-400">(ixtiyoriy — hozircha shart emas)</span>
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200"
            >
              <option value="">— Menejersiz (test tahlil) —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Audio manbasi
            </label>
            {/* URL / Fayl rejimi tanlovi */}
            <div className="mb-3 inline-flex rounded-xl border border-slate-200/70 bg-white/50 p-1 dark:border-slate-700/60 dark:bg-slate-800/40">
              {([
                { id: "url", label: "Havola (URL)", icon: "lock" },
                { id: "file", label: "Fayl yuklash", icon: "upload" },
              ] as const).map((m) => {
                const Icon = Icons[m.icon];
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMode(m.id); setError(null); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-linear-to-r from-indigo-500 to-cyan-400 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {mode === "url" ? (
              <>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://.../qongiroq.mp3"
                  className="w-full rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200"
                />
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Icons.lock className="h-3.5 w-3.5" />
                  Backend audioni shu havoladan yuklab oladi · MP3/WAV/M4A · maks. 20MB
                </p>
              </>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300/70 bg-white/40 px-4 py-7 text-center transition hover:border-indigo-400 hover:bg-indigo-500/5 dark:border-slate-700/60 dark:bg-slate-800/30">
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    className="hidden"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
                  />
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-400 text-white">
                    <Icons.upload className="h-5 w-5" />
                  </span>
                  {file ? (
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {file.name}
                      <span className="ml-2 font-normal text-slate-400">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Audio faylni tanlash uchun bosing
                      </span>
                      <span className="text-xs text-slate-400">MP3/WAV/M4A/OGG · maks. 20MB</span>
                    </>
                  )}
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:underline"
                  >
                    <Icons.close className="h-3.5 w-3.5" /> Faylni olib tashlash
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 via-violet-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "analyzing" ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Tahlil qilinmoqda…</>
            ) : (
              <><Icons.scan className="h-4 w-4" /> Tahlilni boshlash</>
            )}
          </button>
        </form>

        {status === "analyzing" && (
          <div className="mt-6 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-cyan-400">
              <Icons.spark className="h-4 w-4 animate-pulse" />
              Gemini 2.5 Flash transkripsiya va skoring matritsasini tahlil qilmoqda…
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-linear-to-r from-indigo-500 to-cyan-400" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Audio hajmiga qarab bu 10–40 soniya olishi mumkin.</p>
          </div>
        )}

        {status === "error" && error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            <Icons.close className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      <Card className="p-6 lg:col-span-2">
        <SectionTitle title="Tahlil natijasi" />
        {status === "done" && result ? (
          <AnalyzeResultCard result={result} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-slate-400">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-500/10">
              <Icons.waveform className="h-6 w-6" />
            </div>
            <p className="mt-4">Natija shu yerda chiqadi.</p>
            <p className="mt-1 text-xs">Menejerni tanlang, audio havola yoki fayl bering va tahlilni boshlang.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function AnalyzeResultCard({ result }: { result: AnalyzeResult }) {
  const a = result.audit;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <Icons.check className="h-5 w-5 shrink-0" />
        Tahlil yakunlandi · {result.manager.name}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="KPI baho" value={String(Math.round(a.kpi_score))} cls={scoreColor(a.kpi_score)} />
        <StatBox label="Jarima" value={a.penalty_amount ? formatUZS(a.penalty_amount) : "0"} cls="text-rose-500" />
        <StatBox label="Bonus" value={a.bonus_amount ? formatUZS(a.bonus_amount) : "0"} cls="text-emerald-500" />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">ROP Izohi</p>
        <p className="rounded-xl border border-slate-200/60 bg-white/40 p-3 text-sm leading-relaxed text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-300">
          {a.rop_comment || "Izoh berilmagan."}
        </p>
      </div>

      {a.transcript && (
        <details className="group rounded-xl border border-slate-200/60 bg-white/40 dark:border-slate-700/50 dark:bg-slate-800/30">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            To&apos;liq transkripsiya
            <Icons.arrowDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <p className="max-h-60 overflow-y-auto whitespace-pre-line border-t border-slate-200/60 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-slate-700/50 dark:text-slate-300">
            {a.transcript}
          </p>
        </details>
      )}

      {a.lost_reasons.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Yo&apos;qotish sabablari</p>
          <ul className="space-y-1.5">
            {a.lost_reasons.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-rose-500/5 px-3 py-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{r.reason_text}</span>
                <span className="shrink-0 font-semibold text-rose-500">×{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ============================ DEEP AUDIT (chuqur tahlil) ============================ */
/* Endi to'liq backenddan: yuqorida qo'ng'iroq tanlanadi, pastda o'sha
 * qo'ng'iroqning batafsil AI auditi ko'rsatiladi (GET /api/calls/:id). */
export function DeepAuditView() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Qo'ng'iroqlar ro'yxati + menejer nomlari.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [rows, mgrs] = await Promise.all([
          listCalls({ limit: 100 }, ctrl.signal),
          listManagers(ctrl.signal).catch(() => [] as Manager[]),
        ]);
        setCalls(rows);
        setNames(Object.fromEntries(mgrs.map((m) => [m.id, m.name])));
        setSelectedId((cur) => cur || rows[0]?.id || null);
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError")
          setError("Qo'ng'iroqlar ro'yxatini olishda xatolik. Backend (:5001) ishlayotganini tekshiring.");
      } finally {
        setListLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const nameOf = (id: string) => names[id] || `${id.slice(0, 8)}…`;
  // O'chirilgan operatorlarning qo'ng'iroqlarini ro'yxatdan chiqaramiz (dinamik).
  const haveNames = Object.keys(names).length > 0;
  const visibleCalls = haveNames ? calls.filter((c) => !c.manager_id || names[c.manager_id]) : calls;

  return (
    <div className="space-y-6">
      {/* Qo'ng'iroq tanlash */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-fuchsia-500 to-pink-500 text-white">
            <Icons.scan className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Chuqur tahlil uchun qo&apos;ng&apos;iroq</p>
            <p className="text-xs text-slate-400">Backenddan jonli · bittasini tanlang</p>
          </div>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            disabled={listLoading || visibleCalls.length === 0}
            className="w-full max-w-xs rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 disabled:opacity-50 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200"
          >
            {visibleCalls.length === 0 && <option value="">Qo&apos;ng&apos;iroqlar yo&apos;q</option>}
            {visibleCalls.map((c) => (
              <option key={c.id} value={c.id}>
                {nameOf(c.manager_id)} · {formatDateTime(c.created_at)} · KPI {Math.round(c.kpi_score)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {listLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-1" />
          <Skeleton className="h-64 w-full lg:col-span-2" />
        </div>
      ) : selectedId ? (
        <DeepAuditDetail key={selectedId} id={selectedId} nameOf={nameOf} />
      ) : !error ? (
        <Empty text="Tahlil qilingan qo'ng'iroqlar yo'q. «Audio yuklash» orqali birinchi tahlilni boshlang." />
      ) : null}
    </div>
  );
}

/* Tanlangan qo'ng'iroqning to'liq auditi. Har bir qo'ng'iroq uchun alohida
 * mount qilinadi (parent'da key={selectedId}) — shu sababli yuklanish holati
 * o'zgarganda toza qayta yuklanadi, effekt ichida sinxron setState bo'lmaydi
 * (CallDetailModal bilan bir xil naqsh). */
function DeepAuditDetail({ id, nameOf }: { id: string; nameOf: (id: string) => string }) {
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Audioning haqiqiy davomiyligi (metadata'dan) — backend duration noto'g'ri
  // bo'lsa shuni ko'rsatamiz.
  const [realDur, setRealDur] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setDetail(await getCall(id, ctrl.signal));
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setError("Qo'ng'iroq tafsilotini olishda xatolik.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 w-full lg:col-span-1" />
        <Skeleton className="h-64 w-full lg:col-span-2" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
        <Icons.close className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }
  if (!detail) return <Empty text="Qo'ng'iroq topilmadi." />;

  const breakdown = detail.criteria_scores ?? [];
  const shownDuration = realDur ?? detail.duration;
  const nextSteps = detail.next_steps ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Umumiy baho */}
        <Card glow className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Umumiy baho</p>
          <RingGauge value={Math.round(detail.kpi_score)} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{nameOf(detail.manager_id)}</p>
          <p className="text-xs text-slate-400">{formatDateTime(detail.created_at)}</p>
        </Card>

        {/* AI auditor xulosasi */}
        <Card className="p-6 lg:col-span-2">
          <SectionTitle title="AI auditor xulosasi (ROP izohi)" subtitle={`Davomiylik · ${formatSeconds(shownDuration)}`} />
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {detail.summary || detail.rop_comment || "Izoh berilmagan."}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Hissiyot" value={detail.sentiment || "—"} accent="violet" />
            <MiniStat label="Risk darajasi" value={detail.risk || "—"} accent="cyan" />
            <MiniStat label="Jarima" value={detail.penalty_amount ? formatUZS(detail.penalty_amount) : "0"} accent="indigo" />
            <MiniStat label="Bonus" value={detail.bonus_amount ? formatUZS(detail.bonus_amount) : "0"} accent="emerald" />
          </div>
        </Card>
      </div>

      {/* Qayta eshitish — qo'ng'iroq audiosi */}
      {detail.audio_url && (
        <Card className="p-6">
          <SectionTitle title="Qo'ng'iroqni qayta eshitish" subtitle="Audioni platforma ichida tinglang · tezlikni o'zgartiring" />
          <AudioPlayer src={detail.audio_url} onDuration={setRealDur} />
        </Card>
      )}

      {/* Boyitilgan tahlil bloklari — backend bersa ko'rinadi */}
      {(detail.client_info || detail.final_agreement || nextSteps.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {detail.client_info && (
            <Card className="p-6">
              <SectionTitle title="Mijoz haqida ma'lumot" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{detail.client_info}</p>
            </Card>
          )}
          {detail.final_agreement && (
            <Card className="p-6">
              <SectionTitle title="Oxirgi kelishuv" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{detail.final_agreement}</p>
            </Card>
          )}
          {nextSteps.length > 0 && (
            <Card className="p-6">
              <SectionTitle title="Keyingi qadamlar" />
              <ol className="space-y-2">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-linear-to-br from-indigo-500 to-cyan-400 text-[10px] font-bold text-white">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mezonlar / konversiya bo'yicha tahlil */}
        <Card className="p-6">
          <SectionTitle title="Mezonlar bo'yicha tahlil" />
          {breakdown.length > 0 ? (
            <div className="space-y-5">
              {breakdown.map((b, i) => (
                <div key={`${b.title}-${i}`}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{b.title}</span>
                    <span className={`font-bold ${scoreColor(b.score)}`}>{Math.round(b.score)}</span>
                  </div>
                  <ScoreBar score={b.score} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300/60 bg-slate-500/5 px-4 py-3 text-xs text-slate-500 dark:border-slate-600/60 dark:text-slate-400">
              Mezon-mezon bo&apos;yicha baho hali backendda saqlanmaydi. Pastdagi konversiya
              ko&apos;rsatkichlari jonli — to&apos;liq breakdown uchun backend yangilanishi kerak.
            </p>
          )}

          {detail.conversions && (
            <div className="mt-6 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Konversiya (jonli)</p>
              <LabeledBar label="Traffik konversiya" pct={detail.conversions.traffic_conversion} />
              <LabeledBar label="Sotuv konversiya" pct={detail.conversions.sales_conversion} />
            </div>
          )}

          {detail.lost_reasons.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Yo&apos;qotish sabablari</p>
              <ul className="space-y-1.5">
                {detail.lost_reasons.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-rose-500/5 px-3 py-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{r.reason_text}</span>
                    <span className="shrink-0 font-semibold text-rose-500">×{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Transkripsiya */}
        <Card className="p-6">
          <SectionTitle title="Transkripsiya" subtitle="AI auditor matni" />
          {detail.transcript ? (
            <p className="max-h-112 overflow-y-auto whitespace-pre-line rounded-xl border border-slate-200/60 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-300">
              {detail.transcript}
            </p>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300/60 bg-slate-500/5 px-4 py-3 text-xs text-slate-500 dark:border-slate-600/60 dark:text-slate-400">
              Transkripsiya bu qo&apos;ng&apos;iroq uchun saqlanmagan. Backend `calls` jadvaliga
              `transcript` ustuni qo&apos;shilgach, bu yerda jonli ko&apos;rinadi (prompt&apos;ga qarang).
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function RingGauge({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const accent = scoreAccent(value);
  const stops: Record<Accent, [string, string]> = {
    indigo: ["#6366f1", "#8b5cf6"],
    cyan: ["#22d3ee", "#0ea5e9"],
    emerald: ["#34d399", "#14b8a6"],
    violet: ["#8b5cf6", "#d946ef"],
  };
  return (
    <div className="relative my-4 h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stops[accent][0]} />
            <stop offset="100%" stopColor={stops[accent][1]} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-slate-200/70 dark:stroke-slate-700/50" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="url(#gauge)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${scoreColor(value)}`}>{value}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: Accent }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/40 p-3 dark:border-slate-700/50 dark:bg-slate-800/30">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold ${accentText[accent]}`}>{value}</p>
    </div>
  );
}

/* Operatorlar ro'yxati endi backenddan jonli yuklanadi — `operators` tab
 * to'g'ridan-to'g'ri <CompanyView /> ni ko'rsatadi (GET /users). Bu yerdagi
 * statik OperatorsView olib tashlandi. */

/* ============================ CATEGORIES (mezon kategoriyalari) ============================ */
/* Dinamik: alohida jadval yo'q — kategoriyalar jonli mezonlardan (GET /criteria)
 * `category` bo'yicha guruhlanib hosil qilinadi. Yangi mezon qo'shilsa yoki
 * uning kategoriyasi o'zgarsa, bu ro'yxat ham darhol yangilanadi. */
const CATEGORY_PALETTE = [
  "from-indigo-500 to-violet-500",
  "from-cyan-500 to-sky-500",
  "from-emerald-500 to-teal-500",
  "from-fuchsia-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
  "from-sky-500 to-blue-500",
  "from-teal-500 to-emerald-500",
];

export function CategoriesView() {
  const [cats, setCats] = useState<CriteriaCategory[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await listCriteria(signal);
      setCriteria(list);
      setCats(deriveCategories(list));
      setError(null);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError")
        setError("Kategoriyalarni olishda xatolik. Backend (:5001) va `criteria` jadvali tayyorligini tekshiring.");
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      await load(ctrl.signal);
      setLoading(false);
    })();
    return () => ctrl.abort();
  }, [load]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Mezon kategoriyalari"
        subtitle="Baholash mezonlari guruhlangan toifalar (jonli, mezonlardan hosil bo'ladi)"
        action={
          <PillButton icon="layers" accent="cyan" variant="ghost" onClick={() => load()}>
            Yangilash
          </PillButton>
        }
      />

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : cats.length === 0 && !error ? (
        <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Hozircha kategoriya yo&apos;q. «Baholash mezonlari» bo&apos;limida mezon qo&apos;shganda
          unga kategoriya bering — shu yerda avtomatik paydo bo&apos;ladi.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cats.map((cat, i) => {
            const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
            return (
              <Card key={cat.name} hover className="cursor-pointer p-6" onClick={() => setOpenCat(cat.name)}>
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-xl bg-linear-to-br ${color} shadow-md`} />
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      {cat.count} mezon
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {cat.activeCount} aktiv
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">{cat.name}</h3>
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Umumiy bahodagi ulush</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{cat.weight}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
                    <div className={`h-full rounded-full bg-linear-to-r ${color}`} style={{ width: `${cat.weight}%` }} />
                  </div>
                </div>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-cyan-400">
                  <Icons.scan className="h-3.5 w-3.5" /> Mezonlarni ko&apos;rish
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {openCat && (
        <CategoryCriteriaModal
          category={openCat}
          criteria={criteria.filter((c) => ((c.category && c.category.trim()) || "Boshqa mezonlar") === openCat)}
          onClose={() => setOpenCat(null)}
        />
      )}
    </div>
  );
}

/* Kategoriya ichidagi mezonlar ro'yxati (drill-down modal). */
function CategoryCriteriaModal({
  category,
  criteria,
  onClose,
}: {
  category: string;
  criteria: Criterion[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-white/90 shadow-2xl backdrop-blur-xl dark:bg-slate-900/90 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-slate-700/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{category}</h3>
            <p className="text-xs text-slate-400">{criteria.length} ta mezon · {criteria.filter((c) => c.is_active).length} aktiv</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-6">
          {criteria.length === 0 ? (
            <p className="text-sm text-slate-400">Bu kategoriyada mezon yo&apos;q.</p>
          ) : (
            criteria.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200/60 bg-white/40 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.title}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <CriterionTypeBadge type={c.type} />
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {c.is_active ? "Aktiv" : "Nofaol"}
                    </span>
                  </div>
                </div>
                {c.description && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Og&apos;irlik: <b className="text-slate-600 dark:text-slate-300">{c.weight ?? 0}</b></span>
                  {(c.penalty_amount ?? 0) > 0 && <span>Jarima: <b className="text-rose-500">{formatUZS(c.penalty_amount)}</b></span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ CRITERIA (qoidalar) ============================ */
export function CriteriaView() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Criterion | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setCriteria(await listCriteria(signal));
      setError(null);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError")
        setError("Qoidalarni backenddan olishda xatolik. Server (:5001) ishlayotganini tekshiring.");
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setCriteria(await listCriteria(ctrl.signal));
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError")
          setError("Qoidalarni backenddan olishda xatolik. Server (:5001) ishlayotganini tekshiring.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  async function handleAdd(input: NewCriterion) {
    setBusy(true);
    setError(null);
    try {
      await addCriterion(input);
      setAdding(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Qoida qo'shilmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(input: NewCriterion) {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await updateCriterion(editing.id, input);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Qoida saqlanmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(cr: Criterion) {
    setError(null);
    try {
      await updateCriterion(cr.id, { is_active: !cr.is_active });
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Holatni o'zgartirib bo'lmadi.");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    setError(null);
    try {
      await deleteCriterion(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "O'chirib bo'lmadi.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="p-6">
          <SectionTitle
            title="Baholash qoidalari"
            subtitle="Aktiv qoidalarni AI auditor (Gemini) har tahlilda hisobga oladi"
            action={
              <div className="flex items-center gap-2">
                <PillButton icon="layers" accent="cyan" variant="ghost" onClick={() => refresh()}>
                  Yangilash
                </PillButton>
                <PillButton icon="ruler" accent="violet" onClick={() => { setEditing(null); setAdding((v) => !v); }}>
                  {adding ? "Bekor qilish" : "Mezon qo'shish"}
                </PillButton>
              </div>
            }
          />
        </div>

        {error && (
          <div className="mx-6 mb-4 flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            <Icons.close className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200/60 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-700/50">
                <th className="px-6 py-3 font-semibold">Qoida</th>
                <th className="px-6 py-3 font-semibold">Kategoriya</th>
                <th className="px-6 py-3 font-semibold">Tur</th>
                <th className="px-6 py-3 font-semibold">Tavsif</th>
                <th className="px-6 py-3 font-semibold">Jarima</th>
                <th className="px-6 py-3 font-semibold">Holat</th>
                <th className="px-6 py-3 font-semibold text-right">Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100/60 dark:border-slate-800/40">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-56" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="ml-auto h-7 w-7 rounded-lg" /></td>
                  </tr>
                ))
              ) : criteria.length === 0 && !error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                    Hozircha qoida yo&apos;q. &quot;Mezon qo&apos;shish&quot; tugmasini bosing.
                  </td>
                </tr>
              ) : (
                criteria.map((cr) => (
                  <tr key={cr.id} className="border-b border-slate-100/60 transition-colors hover:bg-indigo-500/5 dark:border-slate-800/40 dark:hover:bg-cyan-500/5">
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{cr.title}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {cr.category ? (
                        <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{cr.category}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><CriterionTypeBadge type={cr.type} /></td>
                    <td className="max-w-xs px-6 py-4 text-slate-500 dark:text-slate-400">{cr.description}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {cr.penalty_amount > 0 ? formatUZS(cr.penalty_amount) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(cr)}
                        title={cr.is_active ? "Nofaol qilish" : "Aktivlashtirish"}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:scale-[1.05] ${
                          cr.is_active
                            ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
                            : "bg-slate-500/10 text-slate-500 ring-slate-400/30 dark:text-slate-400"
                        }`}
                      >
                        {cr.is_active ? "Aktiv" : "Nofaol"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setAdding(false); setEditing(cr); }}
                          title="Tahrirlash"
                          className="rounded-lg border border-indigo-300/50 p-2 text-indigo-500 transition hover:scale-[1.05] hover:bg-indigo-500/10 dark:text-cyan-400"
                        >
                          <Icons.pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setToDelete(cr)}
                          title="O'chirish"
                          className="rounded-lg border border-rose-300/50 p-2 text-rose-500 transition hover:scale-[1.05] hover:bg-rose-500/10"
                        >
                          <Icons.close className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {(adding || editing) && (
        <AddCriterionForm
          key={editing?.id ?? "new"}
          busy={busy}
          categories={categoryNames(criteria)}
          initial={editing}
          onSubmit={editing ? handleUpdate : handleAdd}
          onCancel={() => { setAdding(false); setEditing(null); }}
        />
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Qoidani o'chirish"
        message={`«${toDelete?.title}» butunlay o'chiriladi. Davom etasizmi?`}
        confirmLabel="Ha, o'chirish"
        cancelLabel="Yo'q"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------- Mezon turi rangli yorlig'i ---------- */
const CRITERION_TYPES: CriterionType[] = ["Majburiy", "Jarima", "Bonus"];

function CriterionTypeBadge({ type }: { type?: CriterionType | null }) {
  if (!type) return <span className="text-xs text-slate-400">—</span>;
  const cls: Record<string, string> = {
    Majburiy: "bg-indigo-500/10 text-indigo-600 ring-indigo-500/30 dark:text-indigo-400",
    Jarima: "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400",
    Bonus: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls[type] ?? cls.Majburiy}`}>
      {type}
    </span>
  );
}

/* ---------- Qoida (mezon) qo'shish formasi ---------- */
function AddCriterionForm({
  busy,
  categories,
  initial,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  categories: string[];
  initial?: Criterion | null;
  onSubmit: (input: NewCriterion) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [type, setType] = useState<CriterionType>(initial?.type ?? "Majburiy");
  const [weight, setWeight] = useState(String(initial?.weight ?? 10));
  const [penalty, setPenalty] = useState(String(initial?.penalty_amount ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [err, setErr] = useState("");

  function submit(e: SyntheticEvent) {
    e.preventDefault();
    const p = Number(penalty);
    const w = Number(weight);
    if (!title.trim()) {
      setErr("Qoida nomi (title) majburiy.");
      return;
    }
    if (!description.trim()) {
      setErr("Tavsif (description) majburiy.");
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      setErr("Jarima 0 yoki musbat son bo'lsin.");
      return;
    }
    if (!Number.isFinite(w) || w < 0 || w > 100) {
      setErr("Og'irlik 0–100 oralig'ida bo'lsin.");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      penalty_amount: p,
      is_active: isActive,
      category: category.trim() || null,
      weight: w,
      type,
    });
  }

  const field =
    "w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100";
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <Card glow className="p-6">
      <SectionTitle
        title={isEdit ? "Qoidani tahrirlash" : "Yangi qoida qo'shish"}
        subtitle="Backendga (/criteria) saqlanadi — aktiv bo'lsa Gemini keyingi tahlilda shu qoidaga qarab ishlaydi. Kategoriya «Mezon kategoriyalari» bo'limida avtomatik guruhlanadi."
      />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className={labelCls}>Qoida nomi *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Mijozni ism bilan kutib olish"
            className={field}
          />
        </div>
        <div>
          <label className={labelCls}>Tavsif * (Gemini shu matnga qarab baholaydi)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Operator suhbat boshida mijozni ismi bilan samimiy kutib olishi shart."
            className={field}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Kategoriya</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Masalan: Salomlashish & Etiket"
              list="criterion-categories"
              className={field}
            />
            <datalist id="criterion-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Tur</label>
            <select value={type} onChange={(e) => setType(e.target.value as CriterionType)} className={field}>
              {CRITERION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Og&apos;irlik (umumiy bahodagi ulush, %)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="10"
              className={field}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Buzilsa jarima (so&apos;m)</label>
            <input
              type="number"
              min={0}
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              placeholder="0"
              className={field}
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              Darhol aktiv (Gemini ishlatsin)
            </label>
          </div>
        </div>

        {err && <p className="text-sm font-medium text-rose-500">{err}</p>}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:scale-[1.02] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-60"
          >
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icons.check className="h-4 w-4" />}
            {isEdit ? "Saqlash" : "Qo'shish"}
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ============================ amoCRM + n8n ============================ */
const AMOCRM_KEY = "procell-amocrm";

interface AmoConfig {
  enabled: boolean;
  subdomain: string;
  webhookUrl: string;
  n8nUrl: string;
}

const DEFAULT_AMO: AmoConfig = { enabled: false, subdomain: "", webhookUrl: "", n8nUrl: "" };

// Konfiguratsiya brauzerda (localStorage) saqlanadi — backendda alohida
// endpoint yo'q, shuning uchun bu sozlamalar mahalliy va qayta yuklashda saqlanadi.
function loadAmoConfig(): AmoConfig {
  if (typeof window === "undefined") return DEFAULT_AMO;
  try {
    const raw = localStorage.getItem(AMOCRM_KEY);
    return raw ? { ...DEFAULT_AMO, ...(JSON.parse(raw) as Partial<AmoConfig>) } : DEFAULT_AMO;
  } catch {
    return DEFAULT_AMO;
  }
}

/* n8n webhook'ga jo'natiladigan namuna payload — backend qo'ng'iroq tahlili
 * tugagach aynan shu shakldagi ma'lumotni yuboradi (prompt'ga qarang). */
function sampleWebhookPayload(subdomain: string) {
  return {
    event: "call.analyzed",
    source: "procell-ai-audit",
    test: true,
    amocrm_subdomain: subdomain || null,
    call: {
      manager_name: "Test Operator",
      kpi_score: 72,
      penalty_amount: 20000,
      bonus_amount: 0,
      rop_comment: "Bu Procell paneldan yuborilgan test webhook. Ulanish ishlayapti.",
      lost_reasons: [{ reason_text: "Test sababi", count: 1 }],
      audio_url: "https://example.com/test.mp3",
    },
  };
}

type TestStatus = "idle" | "sending" | "ok" | "err";

export function AmoCrmView() {
  const [cfg, setCfg] = useState<AmoConfig>(loadAmoConfig);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<{ status: TestStatus; msg: string }>({ status: "idle", msg: "" });

  function update<K extends keyof AmoConfig>(key: K, val: AmoConfig[K]) {
    setCfg((c) => ({ ...c, [key]: val }));
    setSaved(false);
    setTest({ status: "idle", msg: "" });
  }

  function save(e: SyntheticEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(AMOCRM_KEY, JSON.stringify(cfg));
      setSaved(true);
    } catch {
      /* localStorage mavjud emas — e'tiborsiz qoldiramiz */
    }
  }

  // n8n webhook'iga haqiqiy POST jo'natadi — ulanish ishlayotganini tekshiradi.
  async function sendTestWebhook() {
    const url = cfg.webhookUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setTest({ status: "err", msg: "Avval to'g'ri n8n Webhook URL (http/https) kiriting." });
      return;
    }
    setTest({ status: "sending", msg: "" });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleWebhookPayload(cfg.subdomain)),
      });
      if (!res.ok) {
        setTest({ status: "err", msg: `Webhook ${res.status} qaytardi. n8n workflow faol (active) ekanini tekshiring.` });
        return;
      }
      setTest({ status: "ok", msg: "Test payload yuborildi ✓ — n8n bajaruvlar (executions) ro'yxatini tekshiring." });
    } catch {
      // Odatda CORS yoki tarmoq xatosi. So'rov ketgan bo'lishi mumkin, lekin
      // brauzer javobni o'qiy olmaydi — foydalanuvchiga aniq aytamiz.
      setTest({
        status: "err",
        msg: "So'rovni brauzerdan yuborib bo'lmadi (CORS yoki tarmoq). n8n webhook'da CORS ruxsat bering yoki backend orqali yuboring.",
      });
    }
  }

  const connected = cfg.enabled;
  const ingestUrl = `${API_BASE}/api/analyze-call`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ===== Sarlavha + holat ===== */}
      <Card glow className="overflow-hidden">
        <div className="flex flex-col items-center gap-4 bg-linear-to-br from-sky-500/10 via-cyan-400/5 to-transparent p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-sky-500 to-cyan-400 text-white shadow-[0_0_30px_-6px_rgba(34,211,238,0.7)]">
            <Icons.plug className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">amoCRM avtomatik integratsiya</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Operator gaplashib bo&apos;lgach — qo&apos;ng&apos;iroq o&apos;zi tahlil qilinib, CRM bitimiga yoziladi
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ring-inset ${
              connected
                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
                : "bg-slate-500/10 text-slate-500 ring-slate-500/30"
            }`}
          >
            <span className={`h-2 w-2 rounded-full bg-current ${connected ? "animate-pulse" : ""}`} />
            {connected ? "Integratsiya faol" : "O'chirilgan"}
          </span>
        </div>

        {/* ===== Qanday ishlaydi (3 qadam) ===== */}
        <div className="border-t border-slate-200/60 p-6 dark:border-slate-700/50">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Avtomatik oqim — qanday ishlaydi</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FlowStep n={1} icon="phone" accent="cyan" title="Qo'ng'iroq tugaydi" text="amoCRM telefoniyasi yozuvni (audio) va operatorni beradi." />
            <FlowStep n={2} icon="spark" accent="violet" title="AI tahlil" text="n8n backendni chaqiradi — Gemini baholaydi va bazaga saqlaydi." />
            <FlowStep n={3} icon="check" accent="emerald" title="CRM'ga yoziladi" text="KPI, jarima va ROP izohi bitimga qaytib yoziladi." />
          </div>
        </div>
      </Card>

      {/* ===== Sozlamalar ===== */}
      <Card className="p-6 sm:p-8">
        <form onSubmit={save} className="space-y-6">
          {/* Faollashtirish toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/50 px-4 py-3.5 dark:border-slate-700/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Icons.shield className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jonli integratsiya</p>
                <p className="text-xs text-slate-400">Qo&apos;ng&apos;iroq yopilishi avtomatik oqimni ishga tushiradi</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cfg.enabled}
              onClick={() => update("enabled", !cfg.enabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                cfg.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                  cfg.enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* 1-guruh: CRM hisob */}
          <FieldGroup icon="plug" accent="sky" title="CRM hisob">
            <EditableField
              label="amoCRM subdomen"
              value={cfg.subdomain}
              onChange={(v) => update("subdomain", v)}
              placeholder="procell.amocrm.ru"
            />
          </FieldGroup>

          {/* 2-guruh: n8n ulanishi */}
          <FieldGroup icon="spark" accent="violet" title="n8n ulanishi (natijani CRM'ga qaytarish)">
            <EditableField
              label="n8n Webhook URL"
              value={cfg.webhookUrl}
              onChange={(v) => update("webhookUrl", v)}
              placeholder="https://n8n.example.com/webhook/abc123"
              mono
            />
            <EditableField
              label="n8n Workflow URL (ixtiyoriy)"
              value={cfg.n8nUrl}
              onChange={(v) => update("n8nUrl", v)}
              placeholder="https://n8n.example.com/workflow/42"
              mono
            />
          </FieldGroup>

          {/* 3-guruh: Avtomatik tahlil endpointi (faqat o'qish + nusxalash) */}
          <FieldGroup icon="scan" accent="cyan" title="Avtomatik tahlil endpointi (ingest)">
            <CopyField
              label="Backend ingest URL — amoCRM/n8n shu manzilga audio yuborsin"
              value={ingestUrl}
            />
            <p className="text-xs leading-relaxed text-slate-400">
              n8n shu manzilga <code className="rounded bg-slate-500/10 px-1 py-0.5 font-mono text-[11px]">POST</code>{" "}
              <code className="rounded bg-slate-500/10 px-1 py-0.5 font-mono text-[11px]">{`{ audio_url, manager_id }`}</code>{" "}
              yuborsa, qo&apos;ng&apos;iroq avtomatik tahlil qilinib, doimiy saqlanadi (transkripsiya
              ham qoladi — ochib ketmaydi).
            </p>
          </FieldGroup>

          {/* Tugmalar */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/60 pt-5 dark:border-slate-700/50">
            {saved && (
              <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Icons.check className="h-4 w-4" /> Saqlandi
              </span>
            )}
            <button
              type="button"
              onClick={sendTestWebhook}
              disabled={test.status === "sending"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:scale-[1.02] disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
            >
              {test.status === "sending" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/40 border-t-slate-500" />
              ) : (
                <Icons.spark className="h-4 w-4" />
              )}
              Test ulanish
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-sky-500 to-cyan-400 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02]"
            >
              <Icons.check className="h-4 w-4" /> Sozlamalarni saqlash
            </button>
          </div>

          {test.status !== "idle" && test.status !== "sending" && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
                test.status === "ok"
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-400/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {test.status === "ok" ? <Icons.check className="mt-0.5 h-4 w-4 shrink-0" /> : <Icons.close className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{test.msg}</span>
            </div>
          )}

          <p className="rounded-xl border border-dashed border-slate-300/60 bg-slate-500/5 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-600/60 dark:text-slate-400">
            <b>Eslatma:</b> Sozlamalar hozir brauzerda (localStorage) saqlanadi. To&apos;liq
            avtomatlashtirish (amoCRM → n8n → backend → amoCRM) uchun backend va n8n
            workflow sozlanishi kerak — <code className="font-mono">BACKEND_PROMPT.md</code> ga qarang.
          </p>
        </form>
      </Card>
    </div>
  );
}

/* ---------- amoCRM yordamchi bloklari ---------- */
function FlowStep({
  n,
  icon,
  accent,
  title,
  text,
}: {
  n: number;
  icon: IconKey;
  accent: Accent;
  title: string;
  text: string;
}) {
  const Icon = Icons[icon];
  return (
    <div className="relative rounded-2xl border border-slate-200/60 bg-white/40 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br ${accentGrad[accent]} text-white shadow-sm`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600">0{n}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function FieldGroup({
  icon,
  accent,
  title,
  children,
}: {
  icon: IconKey;
  accent: "sky" | "violet" | "cyan";
  title: string;
  children: ReactNode;
}) {
  const Icon = Icons[icon];
  const tone: Record<string, string> = {
    sky: "bg-sky-500/10 text-sky-500",
    violet: "bg-violet-500/10 text-violet-500",
    cyan: "bg-cyan-500/10 text-cyan-500",
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      </div>
      <div className="space-y-4 pl-1">{children}</div>
    </div>
  );
}

/* Faqat o'qiladigan maydon + nusxalash tugmasi. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard mavjud emas — e'tiborsiz */
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-slate-200/70 bg-slate-500/5 px-4 py-3 font-mono text-sm text-slate-600 outline-none dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300"
        />
        <button
          type="button"
          onClick={copy}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition hover:scale-[1.02] ${
            copied
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-slate-200/70 bg-white/50 text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
          }`}
        >
          <Icons.check className="h-4 w-4" />
          {copied ? "Nusxalandi" : "Nusxa"}
        </button>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

/* Re-export logo so the shell can import everything from one module if desired */
export { Logo };
