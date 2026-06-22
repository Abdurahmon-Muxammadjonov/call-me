"use client";

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import { Icons } from "./Icons";
import {
  Card,
  SectionTitle,
  StatusBadge,
  PillButton,
  Skeleton,
  ConfirmModal,
  scoreAccent,
  accentGrad,
} from "./ui";
import {
  listEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  fetchOnlineIds,
  type Employee,
  type NewEmployee,
} from "../lib/store";

export function CompanyView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  // Re-fetch the list (used after add/edit/delete). Called from event
  // handlers only, never synchronously inside an effect body.
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      setEmployees(await listEmployees(signal));
      setError(null);
    } catch (e) {
      if ((e as Error)?.name !== "AbortError")
        setError("Backenddan ma'lumot olishda xatolik. Server ishlayotganini tekshiring.");
    }
  }, []);

  // Initial load: do all setState after the await so we never trigger a
  // synchronous cascade inside the effect.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const list = await listEmployees(ctrl.signal);
        setEmployees(list);
        setError(null);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError")
          setError("Backenddan ma'lumot olishda xatolik. Server ishlayotganini tekshiring.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  
  useEffect(() => {
    const ctrl = new AbortController();
    const tick = async () => {
      try {
        setOnline(new Set(await fetchOnlineIds(ctrl.signal)));
      } catch {
      }
    };
    tick();
    const timer = setInterval(tick, 15_000);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, []);

  async function handleAdd(input: NewEmployee) {
    setBusy(true);
    setError(null);
    try {
      await addEmployee(input);
      setAdding(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Xodim qo'shilmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: string, name: string) {
    setBusy(true);
    setError(null);
    try {
      await updateEmployee(id, { name });
      setEditingId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Tahrirlash amalga oshmadi.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    const id = toDelete.id;
    setToDelete(null);
    try {
      await deleteEmployee(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "O'chirib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Kompaniya xodimlari"
        subtitle="Backenddan jonli yuklanadi · qo'shing, tahrirlang yoki o'chiring"
        action={
          <PillButton icon="users" accent="indigo" onClick={() => setAdding((v) => !v)}>
            {adding ? "Bekor qilish" : "Xodim qo'shish"}
          </PillButton>
        }
      />

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {adding && <AddEmployeeForm busy={busy} onSubmit={handleAdd} onCancel={() => setAdding(false)} />}

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              isOnline={online.has(emp.id)}
              editing={editingId === emp.id}
              busy={busy}
              onEdit={() => setEditingId(emp.id)}
              onCancelEdit={() => setEditingId(null)}
              onRename={handleRename}
              onDelete={() => setToDelete(emp)}
            />
          ))}
        </div>
      )}

      {!loading && employees.length === 0 && !error && (
        <Card className="p-10 text-center text-slate-500 dark:text-slate-400">
          Hozircha xodimlar yo&apos;q. &quot;Xodim qo&apos;shish&quot; tugmasini bosing.
        </Card>
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Xodimni o'chirish"
        message={`«${toDelete?.name}» backenddan butunlay o'chiriladi. Davom etasizmi?`}
        confirmLabel="Ha, o'chirish"
        cancelLabel="Yo'q"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------- Loading skeleton ---------- */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-1/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-10" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ---------- Add form ---------- */
function AddEmployeeForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (input: NewEmployee) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function submit(e: SyntheticEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !password.trim()) {
      setErr("Ism, email va parol majburiy.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr("Email noto'g'ri formatda.");
      return;
    }
    if (password.length < 6) {
      setErr("Parol kamida 6 ta belgidan iborat bo'lsin.");
      return;
    }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    onSubmit({ name, email, phone, password });
  }

  const field =
    "w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100";

  return (
    <Card glow className="p-6">
      <SectionTitle title="Yangi xodim qo'shish" subtitle="Backendga (/users) saqlanadi" />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ism *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Familiya</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Yangi parol *</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 6 belgi" className={field} />
            <p className="mt-1 text-[11px] text-slate-400">Xodim shu email va parol bilan kiradi</p>
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
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-60"
          >
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icons.check className="h-4 w-4" />}
            Qo&apos;shish
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ---------- Employee card (with inline rename) ---------- */
function EmployeeCard({
  emp,
  isOnline,
  editing,
  busy,
  onEdit,
  onCancelEdit,
  onRename,
  onDelete,
}: {
  emp: Employee;
  isOnline: boolean;
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(emp.name);
  // Reset the rename buffer to the current name each time we enter edit mode,
  // without an effect (avoids synchronous setState-in-effect cascades).
  const [wasEditing, setWasEditing] = useState(editing);
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setName(emp.name);
  }

  const initials = emp.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const field =
    "w-full rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100";

  return (
    <Card hover className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-linear-to-br ${accentGrad[scoreAccent(emp.score || 70)]} text-sm font-bold text-white`}>
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="To'liq ism" className={field} />
          ) : (
            <>
              <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{emp.name}</p>
              <p className="truncate text-xs text-slate-400">{emp.email}</p>
            </>
          )}
        </div>
        <StatusBadge status={isOnline ? "online" : "offline"} />
      </div>

      {!editing && (
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Icons.phone className="h-4 w-4 shrink-0" />
            {emp.phone || "Telefon kiritilmagan"}
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Icons.users className="h-4 w-4 shrink-0" />
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {emp.role}
            </span>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        {editing ? (
          <>
            <button
              onClick={() => onRename(emp.id, name)}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-linear-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60"
            >
              <Icons.check className="h-3.5 w-3.5" /> Saqlash
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-200/70 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:scale-[1.02] dark:border-slate-700/60 dark:text-slate-400"
            >
              Bekor
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200/70 bg-white/50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:scale-[1.02] hover:text-indigo-500 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
            >
              <Icons.ruler className="h-3.5 w-3.5" /> Ismni o&apos;zgartirish
            </button>
            <button
              onClick={onDelete}
              title="O'chirish"
              className="rounded-lg border border-rose-300/50 px-3 py-2 text-xs font-semibold text-rose-500 transition hover:scale-[1.02] hover:bg-rose-500/10"
            >
              <Icons.close className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
