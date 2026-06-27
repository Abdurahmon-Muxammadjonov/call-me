"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icons";
import { SectionTitle, PillButton, Skeleton, ConfirmModal } from "./ui";
import { API_BASE } from "../lib/api";
import {
  listEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  type Employee,
} from "../lib/store";
import type { ScriptItem, ShiftTimes } from "../lib/realtime";

/* =====================================================================
 * StaffManager — admin operator directory + slide-over editor.
 *
 *   • Responsive grid of operator cards; click a card → slide-over opens.
 *   • Editor fields: Name, Phone, Email, Password, Shift start/end,
 *     and assigned Scripts (add / edit / delete / toggle checkbox).
 *
 * Identity (name/phone/email) persists through the existing /users CRUD.
 * Password / shift / scripts use dedicated endpoints (see
 * PROMPT_BACKEND_STAFF.md); calls degrade gracefully until those exist.
 * ===================================================================== */

/* Inputs: split border so an error state can override the normal one cleanly. */
const INPUT_BASE =
  "w-full rounded-xl border bg-white/70 px-4 py-3 text-[15px] text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800/40 dark:text-slate-200";
const INPUT_OK =
  "border-slate-200/70 focus:border-indigo-400 focus:ring-indigo-400/20 dark:border-slate-700/60";
const INPUT_ERR = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20";
const INPUT = `${INPUT_BASE} ${INPUT_OK}`; // non-validated fields (phone, shift)

/* Validation rules. */
const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // "@" va domen bo'lishi shart

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

/* ---------- Best-effort REST helpers for the not-yet-core fields ---------- */
async function fetchShift(id: string, signal?: AbortSignal): Promise<ShiftTimes> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/shift`, { headers: { Accept: "application/json" }, signal });
    if (!res.ok) return { start: "", end: "" };
    const json = (await res.json()) as { data?: ShiftTimes };
    return { start: json.data?.start ?? "", end: json.data?.end ?? "" };
  } catch {
    return { start: "", end: "" };
  }
}

/* Current password — only available if the backend chooses to return it (plain)
 * from this endpoint. Until then it resolves to "" and the field stays empty.
 * See PROMPT_BACKEND_STAFF.md §2.1 (note the security trade-off of exposing it). */
async function fetchCredentials(id: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/credentials`, { headers: { Accept: "application/json" }, signal });
    if (!res.ok) return "";
    const json = (await res.json()) as { data?: { password?: string } };
    return json.data?.password ?? "";
  } catch {
    return "";
  }
}

async function fetchScripts(id: string, signal?: AbortSignal): Promise<ScriptItem[]> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/scripts`, { headers: { Accept: "application/json" }, signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: ScriptItem[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

async function persistExtras(
  id: string,
  payload: { password?: string; shift?: ShiftTimes; scripts?: ScriptItem[] }
): Promise<void> {
  // Each is independent and best-effort; a missing endpoint never blocks a save.
  const calls: Promise<unknown>[] = [];
  if (payload.password) {
    calls.push(
      fetch(`${API_BASE}/users/${id}/credentials`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ password: payload.password }),
      }).catch(() => {})
    );
  }
  if (payload.shift) {
    calls.push(
      fetch(`${API_BASE}/users/${id}/shift`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload.shift),
      }).catch(() => {})
    );
  }
  if (payload.scripts) {
    calls.push(
      fetch(`${API_BASE}/users/${id}/scripts`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ scripts: payload.scripts }),
      }).catch(() => {})
    );
  }
  await Promise.all(calls);
}

/* ===================================================================== */
export function StaffManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // The operator being edited; `"new"` opens the create form; null = closed.
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  // Bumped after a save/delete to re-pull the list (setState only in the
  // effect's async callback — project convention).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        // Faqat xodimlar — direktor/admin "Xodimlar" ro'yxatida ko'rinmasin.
        const list = await listEmployees(ctrl.signal, "user");
        setEmployees(list);
        setError(false);
      } catch {
        if (!ctrl.signal.aborted) setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Operatorlar boshqaruvi"
        subtitle="Xodimlarni tahrirlash, smena va skriptlarni biriktirish"
        action={
          <PillButton icon="plus" onClick={() => setEditing("new")}>
            Yangi operator
          </PillButton>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Operatorlarni yuklab bo'lmadi — backendni tekshiring."}
        </p>
      ) : employees.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Hali operator yo'q. «Yangi operator» orqali qo'shing."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <OperatorCard key={e.id} employee={e} onClick={() => setEditing(e)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <OperatorEditor
            key={editing === "new" ? "new" : editing.id}
            operator={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Grid card ---------- */
function OperatorCard({ employee, onClick }: { employee: Employee; onClick: () => void }) {
  const initials = employee.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const dot =
    employee.status === "online" ? "bg-emerald-400" : employee.status === "away" ? "bg-amber-400" : "bg-slate-400";
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-md transition-all duration-300 hover:border-indigo-300/60 hover:shadow-lg dark:border-slate-800/60 dark:bg-slate-900/30">
      <div className="flex items-center gap-4">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 text-sm font-bold text-white">
          {initials}
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${dot}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{employee.name}</p>
          <p className="truncate text-xs text-slate-400">{employee.role || "Operator"}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{employee.email}</p>
        </div>
      </div>

      {/* Settings — opens the slide-over editor (name/phone/email/password/shift/scripts) */}
      <button
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-indigo-300/60 hover:bg-indigo-500/5 hover:text-indigo-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:text-indigo-300"
      >
        <Icons.ruler className="h-4 w-4" />
        Sozlamalar
      </button>
    </div>
  );
}

/* ---------- Slide-over editor ---------- */
function OperatorEditor({
  operator,
  onClose,
  onSaved,
}: {
  operator: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = operator === null;
  const [name, setName] = useState(operator?.name ?? "");
  const [email, setEmail] = useState(operator?.email ?? "");
  const [phone, setPhone] = useState(operator?.phone ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true); // ko'rinib tursin
  const [shift, setShift] = useState<ShiftTimes>({ start: "", end: "" });
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const tmpId = useRef(0);
  // The password loaded from the backend — used to skip a needless save (and
  // the kick-out it would trigger) when the admin didn't actually change it.
  const initialPassword = useRef("");

  // Load shift + scripts + current password for an existing operator on open.
  useEffect(() => {
    if (!operator) return;
    const ctrl = new AbortController();
    void fetchShift(operator.id, ctrl.signal).then(setShift);
    void fetchScripts(operator.id, ctrl.signal).then(setScripts);
    void fetchCredentials(operator.id, ctrl.signal).then((pw) => {
      initialPassword.current = pw;
      setPassword(pw);
    });
    return () => ctrl.abort();
  }, [operator]);

  // Esc closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clearErr = (k: keyof FieldErrors) =>
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  /* ----- Validation: ism+familiya, email (@), parol (>= MIN) ----- */
  function validate(): boolean {
    const next: FieldErrors = {};

    const n = name.trim();
    if (!n) next.name = "Ism va familiyani kiriting.";
    else if (n.split(/\s+/).length < 2) next.name = "Familiyani ham kiriting (ism + familiya).";

    const em = email.trim();
    if (!em) next.email = "Email kiriting.";
    else if (!EMAIL_RE.test(em)) next.email = "Email noto'g'ri — «@» va domen bo'lishi kerak.";

    // Yangi xodimda parol majburiy; tahrirda faqat o'zgartirilsa tekshiriladi.
    if (isNew) {
      if (!password.trim()) next.password = "Parol kiriting.";
      else if (password.length < MIN_PASSWORD) next.password = `Parol kamida ${MIN_PASSWORD} ta belgi bo'lsin.`;
    } else if (password && password !== initialPassword.current && password.length < MIN_PASSWORD) {
      next.password = `Parol kamida ${MIN_PASSWORD} ta belgi bo'lsin.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* ----- Script row helpers ----- */
  function addScript() {
    setScripts((s) => [...s, { id: `tmp-${tmpId.current++}`, title: "", enabled: true }]);
  }
  function updateScript(id: string, patch: Partial<ScriptItem>) {
    setScripts((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeScript(id: string) {
    setScripts((s) => s.filter((x) => x.id !== id));
  }

  async function handleSave() {
    if (saving) return;
    if (!validate()) return; // xatolar bo'lsa — so'rov yubormaymiz, inline ko'rsatamiz
    setSaving(true);
    try {
      const cleanScripts = scripts.filter((s) => s.title.trim());
      if (isNew) {
        const created = await addEmployee({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
        });
        await persistExtras(created.id, { shift, scripts: cleanScripts });
      } else {
        await updateEmployee(operator.id, { name: name.trim(), email: email.trim(), phone: phone.trim() });
        // Only push the password if it was actually edited — avoids a needless
        // credential change (which would kick the operator out).
        const pwChanged = password.trim() !== "" && password !== initialPassword.current;
        await persistExtras(operator.id, {
          password: pwChanged ? password.trim() : undefined,
          shift,
          scripts: cleanScripts,
        });
      }
      onSaved();
    } catch {
      setSaving(false); // keep the panel open so the admin can retry
    }
  }

  async function handleDelete() {
    if (!operator) return;
    try {
      await deleteEmployee(operator.id);
      onSaved();
    } catch {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-150 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className="relative flex h-full min-h-screen w-full max-w-2xl flex-col border-l border-slate-200/60 bg-white/95 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/90"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {isNew ? "Yangi operator" : "Operatorni tahrirlash"}
            </h3>
            {!isNew && <p className="text-xs text-slate-400">{operator.email}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Icons.close className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <Field label="Ism familiya" icon="users" error={errors.name}>
            <input
              className={`${INPUT_BASE} ${errors.name ? INPUT_ERR : INPUT_OK}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearErr("name");
              }}
              placeholder="Dilnoza Karimova"
            />
          </Field>
          <Field label="Telefon" icon="phone">
            <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
          </Field>
          <Field label="Email" icon="mail" error={errors.email}>
            <input
              className={`${INPUT_BASE} ${errors.email ? INPUT_ERR : INPUT_OK}`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErr("email");
              }}
              placeholder="operator@salespulse.uz"
            />
          </Field>
          <Field label="Parol" icon="lock" error={errors.password}>
            <div className="relative">
              <input
                className={`${INPUT_BASE} ${errors.password ? INPUT_ERR : INPUT_OK} pr-12`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearErr("password");
                }}
                placeholder={`Kamida ${MIN_PASSWORD} ta belgi`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <Icons.eyeOff className="h-4.5 w-4.5" /> : <Icons.eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </Field>

          {/* Shift times */}
          <Field label="Ish vaqti (smena)" icon="clock">
            <div className="flex items-center gap-3">
              <input className={INPUT} type="time" value={shift.start} onChange={(e) => setShift((s) => ({ ...s, start: e.target.value }))} />
              <span className="text-sm text-slate-400">—</span>
              <input className={INPUT} type="time" value={shift.end} onChange={(e) => setShift((s) => ({ ...s, end: e.target.value }))} />
            </div>
          </Field>

          {/* Scripts */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Icons.layers className="h-4 w-4" /> Biriktirilgan skriptlar
              </label>
              <button
                onClick={addScript}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-500 transition-colors hover:bg-indigo-500/10"
              >
                <Icons.plus className="h-3.5 w-3.5" /> Qo&apos;shish
              </button>
            </div>

            {scripts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                {"Skript biriktirilmagan"}
              </p>
            ) : (
              <ul className="space-y-2">
                {scripts.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-800/30"
                  >
                    {/* Assigned checkbox */}
                    <button
                      onClick={() => updateScript(s.id, { enabled: !s.enabled })}
                      aria-label="Faollashtirish"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all duration-200 ${
                        s.enabled
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {s.enabled && <Icons.check className="h-3.5 w-3.5" />}
                    </button>
                    {/* Editable title */}
                    <input
                      value={s.title}
                      onChange={(e) => updateScript(s.id, { title: e.target.value })}
                      placeholder="Skript nomi"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
                    />
                    {/* Delete */}
                    <button
                      onClick={() => removeScript(s.id)}
                      aria-label="O'chirish"
                      className="shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Icons.trash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-7 py-5 dark:border-slate-800">
          {!isNew && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              title="Operatorni o'chirish"
            >
              <Icons.trash className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200/70 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-500/5 dark:border-slate-700/60 dark:text-slate-300"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-linear-to-r from-indigo-500 to-cyan-400 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </motion.aside>

      <ConfirmModal
        open={confirmDelete}
        title="Operatorni o'chirish"
        message={`${operator?.name ?? ""}ni o'chirishni tasdiqlaysizmi?`}
        confirmLabel="Ha, o'chirish"
        cancelLabel="Yo'q"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/* ---------- Labelled field wrapper ---------- */
function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: keyof typeof Icons;
  error?: string;
  children: ReactNode;
}) {
  const Icon = Icons[icon];
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" /> {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
