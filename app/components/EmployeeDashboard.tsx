"use client";

import { useEffect, useState } from "react";
import { Icons } from "./Icons";
import {
  Card,
  SectionTitle,
  ScoreBar,
  StatusBadge,
  Logo,
  ThemeToggle,
  LiveClock,
  useNow,
  Skeleton,
  ConfirmModal,
  TypeWriter,
  scoreColor,
  scoreAccent,
  accentGrad,
} from "./ui";
import {
  getEmployee,
  pingPresence,
  goOffline,
  DEFAULT_TIPS,
  type Employee,
  type EmpCall,
  type Penalty,
} from "../lib/store";
import type { Session } from "../lib/auth";
import { useLiveProfile, useScripts, useShift, type ScriptItem } from "../lib/realtime";
import { useManagerRealtime, type ManagerShift } from "../lib/useManagerRealtime";
import { NotificationBell } from "./NotificationBell";
import { StaffRealtimeLayer } from "./StaffRealtimeLayer";

type EmpTab = "overview" | "calls" | "schedule" | "tips" | "penalties";

/* Performance shown on the dashboard. It comes 100% from the backend Employee
 * record — there is no demo/placeholder data. Until the backend exposes
 * call/score data these are simply zero/empty (handled by empty states). */
type EmpPerf = Pick<Employee, "score" | "calls" | "status" | "penalties" | "recentCalls" | "tips">;

const NAV: { id: EmpTab; label: string; icon: keyof typeof Icons; grad: string }[] = [
  { id: "overview", label: "Umumiy ko'rinish", icon: "grid", grad: "from-indigo-500 to-violet-500" },
  { id: "calls", label: "Mening qo'ng'iroqlarim", icon: "waveform", grad: "from-cyan-500 to-sky-500" },
  { id: "schedule", label: "Ish vaqtim", icon: "clock", grad: "from-violet-500 to-fuchsia-500" },
  { id: "tips", label: "Tavsiyalar", icon: "spark", grad: "from-emerald-500 to-teal-500" },
  { id: "penalties", label: "Jarimalar", icon: "shield", grad: "from-rose-500 to-pink-500" },
];

export function EmployeeDashboard({
  session,
  isDark,
  onToggleTheme,
  onLogout,
}: {
  session: Session;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(() => Boolean(session.employeeId));
  const [tab, setTab] = useState<EmpTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sheetCall, setSheetCall] = useState<EmpCall | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  // Real identity from the backend; performance is placeholder demo data.
  useEffect(() => {
    const id = session.employeeId;
    if (!id) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const found = await getEmployee(id, ctrl.signal);
        setEmp(found);
      } catch {
        /* ignore — show what we have from the session */
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [session.employeeId]);

  // Heartbeat: while this employee's dashboard is open, keep them "online"
  // for the director's list. Stops on unmount → they drop offline after the
  // backend's presence window.
  useEffect(() => {
    const id = session.employeeId;
    if (!id) return;
    pingPresence(id);
    const timer = setInterval(() => pingPresence(id), 45_000);
    return () => clearInterval(timer);
  }, [session.employeeId]);

  function handleLogout() {
    if (session.employeeId) goOffline(session.employeeId);
    onLogout();
  }

  // Name sync — two layers, instant wins:
  //   • useManagerRealtime: Supabase Realtime, ~1s (when configured)
  //   • useLiveProfile: REST polling fallback (~8s)
  const polledName = useLiveProfile(session.employeeId, emp?.name ?? session.name);
  const rt = useManagerRealtime(session.employeeId);
  const name = rt.name ?? polledName;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  // Realtime shift override → threaded into the schedule cards.
  const liveShift: ManagerShift | null = rt.shift;
  // Admin biriktirgan skriptlar — Tavsiyalar bo'limida jonli ko'rinadi
  // (StaffManager bilan bitta manba; admin qo'shsa, shu yerda darhol chiqadi).
  const scripts = useScripts(session.employeeId);
  // Real performance from the backend; the viewing employee is, by definition,
  // online right now (their heartbeat is running).
  const perf: EmpPerf = {
    score: emp?.score ?? 0,
    calls: emp?.calls ?? 0,
    status: "online",
    penalties: emp?.penalties ?? [],
    recentCalls: emp?.recentCalls ?? [],
    tips: emp?.tips ?? DEFAULT_TIPS,
  };
  const totalPenalty = perf.penalties.reduce((s, p) => s + p.points, 0);

  function select(id: EmpTab) {
    setTab(id);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 dark:bg-[#060814] dark:text-slate-200">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />
        <div className="absolute -right-32 bottom-0 h-120 w-120 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
      </div>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" />
      )}

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-xl transition-transform duration-300 dark:border-slate-800/60 dark:bg-slate-950/60 lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Logo />
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 lg:hidden">
              <Icons.close className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              SHAXSIY KABINET
            </p>
            {NAV.map((item) => {
              const Icon = Icons[item.icon];
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => select(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "bg-linear-to-r from-indigo-500/15 to-cyan-400/10 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20 dark:text-cyan-300 dark:ring-cyan-400/20"
                      : "text-slate-500 hover:bg-slate-500/5 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br transition-all duration-300 ${item.grad} ${active ? "text-white shadow-[0_0_16px_-4px_rgba(99,102,241,0.8)]" : "text-white/90 opacity-70 group-hover:opacity-100"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-slate-200/60 p-4 dark:border-slate-800/60">
            <div className="flex items-center gap-3 rounded-xl bg-slate-500/5 p-3 dark:bg-slate-800/40">
              <span className={`grid h-10 w-10 place-items-center rounded-full bg-linear-to-br ${accentGrad[scoreAccent(perf.score)]} text-sm font-bold text-white`}>
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{name}</p>
                <p className="truncate text-xs text-slate-400">{session.title}</p>
              </div>
              <button onClick={() => setConfirmOut(true)} title="Chiqish" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500">
                <Icons.logout className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/60 bg-white/70 px-4 py-3.5 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/50 sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-500/10 lg:hidden">
              <Icons.menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {NAV.find((n) => n.id === tab)?.label}
              </h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">Shaxsiy ish kabineti</p>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-sm dark:border-slate-700/60 dark:bg-slate-800/40 sm:flex">
              <Icons.clock className="h-4 w-4 text-indigo-500 dark:text-cyan-400" />
              <LiveClock className="font-semibold text-slate-700 dark:text-slate-200" />
            </div>
            <NotificationBell userId={session.employeeId} />
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div key={tab} className="mx-auto max-w-5xl animate-slide-up">
              {loading ? (
                <OverviewSkeleton />
              ) : (
                <>
                  {tab === "overview" && (
                    <Overview name={name} title={session.title} email={emp?.email ?? session.email} initials={initials} perf={perf} totalPenalty={totalPenalty} userId={session.employeeId} shiftOverride={liveShift} />
                  )}
                  {tab === "calls" && <CallsTab calls={perf.recentCalls} onOpen={setSheetCall} />}
                  {tab === "schedule" && <ScheduleTab userId={session.employeeId} override={liveShift} />}
                  {tab === "tips" && <TipsTab scripts={scripts} fallback={perf.tips} />}
                  {tab === "penalties" && <PenaltiesTab penalties={perf.penalties} total={totalPenalty} />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <ScoreSheet call={sheetCall} onClose={() => setSheetCall(null)} />

      <ConfirmModal
        open={confirmOut}
        title="Akkaunddan chiqish"
        message="Tizimdan chiqmoqchimisiz?"
        confirmLabel="Ha, chiqish"
        cancelLabel="Yo'q"
        tone="danger"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOut(false)}
      />

      {/* Real-time listeners: kick-out on credential change + shift banners.
          Booting to login reuses the same logout path (presence cleanup). */}
      <StaffRealtimeLayer session={session} onLogout={handleLogout} />
    </div>
  );
}

/* ============================ TABS ============================ */
function Overview({
  name,
  title,
  email,
  initials,
  perf,
  totalPenalty,
  userId,
  shiftOverride,
}: {
  name: string;
  title: string;
  email: string;
  initials: string;
  perf: EmpPerf;
  totalPenalty: number;
  userId: string | undefined;
  shiftOverride: ManagerShift | null;
}) {
  return (
    <div className="space-y-6">
      <Card glow className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${accentGrad[scoreAccent(perf.score)]} text-xl font-bold text-white shadow-lg`}>
          {initials}
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Xush kelibsiz</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title} · {email}</p>
        </div>
        <StatusBadge status={perf.status} />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon="phone" grad="from-indigo-500 to-violet-500" value={String(perf.calls)} label="Qo'ng'iroqlar" />
        <StatTile icon="shield" grad={accentGrad[scoreAccent(perf.score)]} value={String(perf.score)} label="Sifat bahosi" valueCls={scoreColor(perf.score)} bar={perf.score} />
        <StatTile icon="ruler" grad="from-rose-500 to-pink-500" value={String(totalPenalty)} label="Jami jarima ball" valueCls={totalPenalty < 0 ? "text-rose-500" : "text-emerald-500"} />
      </div>

      <ScheduleTab userId={userId} override={shiftOverride} compact />
    </div>
  );
}

function StatTile({
  icon,
  grad,
  value,
  label,
  valueCls = "text-slate-800 dark:text-white",
  bar,
}: {
  icon: keyof typeof Icons;
  grad: string;
  value: string;
  label: string;
  valueCls?: string;
  bar?: number;
}) {
  const Icon = Icons[icon];
  return (
    <Card hover className="p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br ${grad} text-white shadow-md`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className={`text-2xl font-bold ${valueCls}`}>{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
      {bar !== undefined && <div className="mt-3"><ScoreBar score={bar} /></div>}
    </Card>
  );
}

function CallsTab({ calls, onOpen }: { calls: EmpCall[]; onOpen: (c: EmpCall) => void }) {
  return (
    <Card className="p-6">
      <SectionTitle title="Mening qo'ng'iroqlarim" subtitle="Bahoni bosing — nega shunday baholanganini ko'ring" />
      {calls.length === 0 ? (
        <Empty text="Hali tahlil qilingan qo'ng'iroqlaringiz yo'q." />
      ) : (
        <ul className="space-y-4">
          {calls.map((call) => (
            <li key={call.id} className="rounded-xl border border-slate-200/60 bg-white/40 p-4 dark:border-slate-700/50 dark:bg-slate-800/30">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{call.topic}</p>
                  <p className="text-xs text-slate-400">{call.id} · {call.date} · {call.duration}</p>
                </div>
                <button
                  onClick={() => onOpen(call)}
                  title="Tafsilotlarni ko'rish"
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-lg font-bold transition hover:scale-[1.05] ${scoreColor(call.score)} bg-slate-500/5 dark:bg-slate-800/40`}
                >
                  {call.score}
                  <Icons.scan className="h-4 w-4 opacity-60" />
                </button>
              </div>
              <ScoreBar score={call.score} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TipsTab({ scripts, fallback }: { scripts: ScriptItem[]; fallback: string[] }) {
  // Admin biriktirgan, yoqilgan skriptlar — bular tavsiyalar bo'lib ko'rinadi.
  const assigned = scripts.filter((s) => s.enabled && s.title.trim());
  return (
    <div className="space-y-5">
      {/* Admin tomonidan biriktirilgan skriptlar (jonli) */}
      <Card className="p-6">
        <SectionTitle
          title="Biriktirilgan skriptlar"
          subtitle="Administrator siz uchun biriktirgan tavsiyalar — jonli yangilanadi"
        />
        {assigned.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/40 px-4 py-5 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400">
            <Icons.spark className="h-5 w-5 shrink-0 text-indigo-400" />
            {"Hozircha skript biriktirilmagan."}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {assigned.map((s, i) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-xl border border-indigo-200/50 bg-indigo-500/5 px-4 py-2.5 text-sm text-slate-700 dark:border-indigo-400/20 dark:text-slate-200"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-linear-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {s.title}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Umumiy nutq tavsiyalari (standart) */}
      <Card className="p-6">
        <SectionTitle title="Qanday gapirish kerak" subtitle="Umumiy nutq tavsiyalari" />
        <ul className="space-y-2.5">
          {fallback.map((tip, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/40 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-300">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-linear-to-br from-indigo-500 to-cyan-400 text-[10px] font-bold text-white">{i + 1}</span>
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function PenaltiesTab({ penalties, total }: { penalties: Penalty[]; total: number }) {
  return (
    <Card className="p-6">
      <SectionTitle title="Jarimalar va eslatmalar" subtitle={penalties.length ? `Jami: ${total} ball` : undefined} />
      {penalties.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-5 text-emerald-600 dark:text-emerald-400">
          <Icons.check className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Hech qanday jarima yo&apos;q — a&apos;lo ish! 🎉</span>
        </div>
      ) : (
        <ul className="space-y-3">
          {penalties.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-500"><Icons.close className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.reason}</p>
                  <p className="text-xs text-slate-400">{p.date}</p>
                </div>
              </div>
              <span className="font-bold text-rose-500">{p.points}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============================ SCHEDULE ============================ */
function ScheduleTab({
  userId,
  override = null,
  compact = false,
}: {
  userId: string | undefined;
  override?: ManagerShift | null;
  compact?: boolean;
}) {
  // Smena vaqti adminning Sozlamalaridan jonli keladi. Ikki qatlam:
  //   • override → Supabase Realtime (sub-soniya, mavjud bo'lsa ustun turadi)
  //   • useShift → REST polling fallback (~8s)
  // Backend qiymat bermaguncha standart 09:00–18:00 ko'rsatiladi.
  const polled = useShift(userId);
  const live = override && (override.start || override.end) ? override : polled;
  const start = live.start || "09:00";
  const end = live.end || "18:00";
  const adminSet = Boolean(live.start || live.end);
  const now = useNow();

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(start);
  const endMin = toMin(end);
  const breakStart = 13 * 60;
  const breakEnd = 14 * 60;

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : startMin;
  const total = Math.max(1, endMin - startMin);
  const elapsed = Math.min(Math.max(nowMin - startMin, 0), total);
  const pct = (elapsed / total) * 100;
  const remainingMin = Math.max(0, endMin - nowMin);

  let state: { label: string; cls: string };
  if (nowMin < startMin) state = { label: "Smena boshlanmagan", cls: "text-slate-500" };
  else if (nowMin >= endMin) state = { label: "Smena tugadi", cls: "text-rose-500" };
  else if (nowMin >= breakStart && nowMin < breakEnd) state = { label: "Tanaffus", cls: "text-amber-500" };
  else state = { label: "Ish vaqtida", cls: "text-emerald-500" };

  const fmt = (mins: number) => `${Math.floor(mins / 60)}s ${mins % 60}d`;
  const input =
    "rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm font-mono text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100";

  return (
    <Card glow={!compact} className="p-6">
      <SectionTitle
        title={compact ? "Ish vaqti" : "Ish vaqtim va smena"}
        subtitle={compact ? undefined : "Smena vaqtini sozlang — jonli hisoblanadi"}
        action={
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold ${state.cls}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {state.label}
          </span>
        }
      />

      {/* Live clock */}
      <div className="mb-5 flex flex-col items-center rounded-2xl bg-linear-to-br from-indigo-500/10 to-cyan-400/10 py-6 ring-1 ring-indigo-500/15">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hozirgi vaqt</p>
        <LiveClock className="mt-1 text-4xl font-bold text-slate-800 dark:text-white" />
      </div>

      {/* Smena vaqti — admin belgilaydi (read-only) */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ish boshlanishi</span>
          <input type="time" value={start} readOnly disabled className={`${input} cursor-default opacity-90`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ish tugashi</span>
          <input type="time" value={end} readOnly disabled className={`${input} cursor-default opacity-90`} />
        </label>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Icons.lock className="h-3.5 w-3.5" />
        {adminSet ? "Smena vaqti administrator tomonidan belgilangan." : "Standart smena — administrator hali belgilamagan."}
      </p>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Smena jarayoni</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(pct)}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
          <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Info label="Tanaffus" value="13:00–14:00" />
          <Info label="Tugashiga" value={nowMin < endMin ? fmt(remainingMin) : "—"} />
          <Info label="Smena" value={`${start}–${end}`} />
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/60 bg-white/40 py-2 dark:border-slate-700/50 dark:bg-slate-800/30">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

/* ============================ SCORE BOTTOM SHEET ============================ */
function ScoreSheet({ call, onClose }: { call: EmpCall | null; onClose: () => void }) {
  useEffect(() => {
    if (!call) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [call, onClose]);

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" />
      <div className="glass glow-ring relative max-h-[88vh] w-full max-w-lg animate-sheet-up overflow-y-auto rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300/70 dark:bg-slate-600/70 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{call.id} · {call.date}</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{call.topic}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-500/10 hover:text-slate-600">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>

        {/* Score */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-500/5 p-4 dark:bg-slate-800/40">
          <span className={`text-4xl font-bold ${scoreColor(call.score)}`}>{call.score}</span>
          <div className="flex-1">
            <ScoreBar score={call.score} />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{call.feedback}</p>
          </div>
        </div>

        {/* Transcript with cursor */}
        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 dark:bg-cyan-500/5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-cyan-400">
            <Icons.waveform className="h-3.5 w-3.5" /> Siz nima dedingiz
          </p>
          <p className="text-sm italic leading-relaxed text-slate-600 dark:text-slate-200">
            <TypeWriter text={`“${call.said}”`} />
          </p>
        </div>

        {/* Said well */}
        {call.saidWell.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">✓ Yaxshi bajardingiz</p>
            <ul className="space-y-2">
              {call.saidWell.map((s, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missed */}
        {call.missed.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-rose-600 dark:text-rose-400">✗ Aytmadingiz / xato</p>
            <ul className="space-y-2">
              {call.missed.map((s, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  <Icons.close className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ HELPERS ============================ */
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/40 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/30 dark:text-slate-400">
      {text}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4 p-6">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </Card>
    </div>
  );
}
