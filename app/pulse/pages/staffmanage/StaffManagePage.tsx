"use client";

/* XODIMLARNI BOSHQARISH — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski StaffManager'ning BUTUN mantiqi saqlangan: xodimlar (role=user)
 * kartalari, yon panelda tahrirlash (ism, telefon, email, parol, smena,
 * skriptlar), validatsiya (ism + familiya, email, parol >= 6), parol faqat
 * o'zgartirilganda yuboriladi (aks holda operator tizimdan chiqib ketadi),
 * o'chirishdan oldin tasdiq, 30 soniyada avtomatik yangilanish.
 * Qo'shimcha: "📅 Sana" — tanlangan kunning xulosasi (DayStrip). */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePT } from "../../i18n";
import { Button, Card, IconButton, Skeleton, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Drawer, OverlayHeader } from "../../ui/overlays";
import { CheckBox, ConfirmDialog, Field, TextInput } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { DayStrip } from "../../ui/DayStrip";
import { FilterBar } from "../../ui/FilterBar";
import { toast } from "../../ui/toast";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { initialsOf, useMe } from "../../data/me";
import { apiUrl, authHeadersAuto } from "../../../lib/api";
import { listEmployees, addEmployee, updateEmployee, deleteEmployee, type Employee } from "../../../lib/store";
import type { ScriptItem, ShiftTimes } from "../../../lib/realtime";
import { TONE_VARS, type Tone } from "../../lib/tones";
import { fmtInt } from "../../lib/format";

const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // "@" va domen bo'lishi shart
const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/* Avatar ranglari — kartalar bir-biridan ajralsin (id bo'yicha barqaror). */
const AVATAR = ["var(--pn-lilac)", "var(--pn-sky)", "var(--pn-peach)", "var(--pn-pink)", "var(--pn-periwinkle)"];
function avatarOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

function statusOf(s: Employee["status"]): { tone: Tone; key: "online" | "away" | "offline" } {
  if (s === "online") return { tone: "good", key: "online" };
  if (s === "away") return { tone: "warn", key: "away" };
  return { tone: "neutral", key: "offline" };
}

/* ---------- Qo'shimcha maydonlar (eski StaffManager bilan bir xil REST) ---------- */
async function fetchShift(id: string, signal?: AbortSignal): Promise<ShiftTimes> {
  try {
    const res = await fetch(apiUrl(`/users/${id}/shift`), { headers: { Accept: "application/json", ...authHeadersAuto() }, signal });
    if (!res.ok) return { start: "", end: "" };
    const json = (await res.json()) as { data?: ShiftTimes };
    return { start: json.data?.start ?? "", end: json.data?.end ?? "" };
  } catch {
    return { start: "", end: "" };
  }
}

async function fetchCredentials(id: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch(apiUrl(`/users/${id}/credentials`), { headers: { Accept: "application/json", ...authHeadersAuto() }, signal });
    if (!res.ok) return "";
    const json = (await res.json()) as { data?: { password?: string | null } };
    return json.data?.password ?? "";
  } catch {
    return "";
  }
}

async function fetchScripts(id: string, signal?: AbortSignal): Promise<ScriptItem[]> {
  try {
    const res = await fetch(apiUrl(`/users/${id}/scripts`), { headers: { Accept: "application/json", ...authHeadersAuto() }, signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: ScriptItem[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function persistExtras(id: string, payload: { password?: string; shift?: ShiftTimes; scripts?: ScriptItem[] }): Promise<void> {
  // Har biri mustaqil; endpoint bo'lmasa ham saqlash to'xtamaydi.
  const calls: Promise<unknown>[] = [];
  if (payload.password) {
    calls.push(fetch(apiUrl(`/users/${id}/credentials`), { method: "PUT", headers: { ...JSON_HEADERS, ...authHeadersAuto() }, body: JSON.stringify({ password: payload.password }) }).catch(() => {}));
  }
  if (payload.shift) {
    calls.push(fetch(apiUrl(`/users/${id}/shift`), { method: "PUT", headers: { ...JSON_HEADERS, ...authHeadersAuto() }, body: JSON.stringify(payload.shift) }).catch(() => {}));
  }
  if (payload.scripts) {
    calls.push(fetch(apiUrl(`/users/${id}/scripts`), { method: "PUT", headers: { ...JSON_HEADERS, ...authHeadersAuto() }, body: JSON.stringify({ scripts: payload.scripts }) }).catch(() => {}));
  }
  await Promise.all(calls);
}

/* ===================================================================== */

export function StaffManagePage() {
  const t = usePT();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "online" | "offline">("all");
  const key = ["v1", me?.company.id ?? "_", "/users?role=user"] as const;
  const list = useQuery({
    queryKey: key,
    // Faqat xodimlar — direktor/admin ro'yxatda ko'rinmasin.
    queryFn: ({ signal }) => listEmployees(signal, "user"),
    enabled: !!me,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const employees = useMemo(() => list.data ?? [], [list.data]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return employees
      .filter((e) => status === "all" || (status === "online" ? e.status === "online" : e.status !== "online"))
      .filter((e) => !s || `${e.name} ${e.email} ${e.phone}`.toLowerCase().includes(s));
  }, [employees, q, status]);
  const online = employees.filter((e) => e.status === "online").length;

  return (
    <div className="@container/sm flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("sm.eyebrow")}</span>}
        title={t("sm.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="SM-DATE" />
            <Button variant="primary" icon="plus" onClick={() => setEditing("new")} testId="SM-NEW">{t("sm.new")}</Button>
            <HeaderBell />
          </>
        }
      />

      <DayStrip date={sel.date} isToday={sel.isToday} testId="SM-DAY" />

      <Card pad="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <h2 className="pn-card-title">{t("sm.list")}</h2>
            {list.data && (
              <span className="text-[13px] text-pn-muted">
                {t("sm.count", { n: fmtInt(employees.length) })} · <span style={{ color: TONE_VARS.good.text }}>{t("sm.onlineN", { n: fmtInt(online) })}</span>
              </span>
            )}
          </div>
          <FilterBar<"all" | "online" | "offline">
            ariaLabel={t("filter.label")}
            testId="SM-F"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("filter.all"), count: employees.length },
              { value: "online", label: t("sm.f.online"), count: online },
              { value: "offline", label: t("sm.f.offline"), count: employees.length - online },
            ]}
            search={{ value: q, onChange: setQ, placeholder: t("sm.search") }}
          />
        </div>

        <div className="border-t border-pn-border p-4">
          {list.isPending ? (
            <div className="grid grid-cols-1 gap-3 @min-[620px]/sm:grid-cols-2 @min-[1000px]/sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={132} r={22} />)}
            </div>
          ) : list.isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-[14px] text-pn-muted">
              {t("sm.loadError")}
              <Button variant="outline" compact icon="refresh" onClick={() => void list.refetch()}>{t("common.retry")}</Button>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-pn-panel-2 text-pn-muted"><Icon name="users" /></span>
              <p className="max-w-sm text-[14px] text-pn-muted">{t("sm.empty")}</p>
              <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>{t("sm.new")}</Button>
            </div>
          ) : shown.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-pn-muted">{t("sm.noMatch")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 @min-[620px]/sm:grid-cols-2 @min-[1000px]/sm:grid-cols-3">
              {shown.map((e) => <EmployeeCard key={e.id} employee={e} onOpen={() => setEditing(e)} />)}
            </div>
          )}
        </div>
      </Card>

      {editing && (
        <EmployeeEditor
          key={editing === "new" ? "new" : editing.id}
          operator={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: key });
          }}
        />
      )}
    </div>
  );
}

/* ---------- Karta ---------- */
function EmployeeCard({ employee, onOpen }: { employee: Employee; onOpen: () => void }) {
  const t = usePT();
  const st = statusOf(employee.status);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`SM-CARD-${employee.id}`}
      className="pn-press group flex min-w-0 flex-col gap-4 rounded-[22px] border border-pn-border bg-pn-panel-2 p-4 text-left hover:border-pn-border-3"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-[14px] font-bold text-pn-pastel-ink" style={{ background: avatarOf(employee.id) }}>
          {initialsOf(employee.name)}
          <span aria-hidden className="absolute -bottom-px -right-px h-[14px] w-[14px] rounded-full border-[3px] border-pn-panel-2" style={{ background: TONE_VARS[st.tone].fg }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-pn-text">{employee.name}</span>
          <span className="block truncate text-[12px] text-pn-muted">{employee.email || "—"}</span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <StatusPill tone={st.tone} plain>{t(`op.status.${st.key}` as "op.status.online")}</StatusPill>
          {employee.phone && <span className="pn-mono truncate text-[12px] text-pn-subtle">{employee.phone}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-pn-muted group-hover:text-pn-text">
          <Icon name="pencil" size={13} /> {t("sm.edit")}
        </span>
      </span>
    </button>
  );
}

/* ---------- Yon panel: tahrirlash / yangi ---------- */
interface FieldErrors { name?: string; email?: string; password?: string }

function EmployeeEditor({ operator, onClose, onSaved }: { operator: Employee | null; onClose: () => void; onSaved: () => void }) {
  const t = usePT();
  const isNew = operator === null;
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(operator?.name ?? "");
  const [email, setEmail] = useState(operator?.email ?? "");
  const [phone, setPhone] = useState(operator?.phone ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [shift, setShift] = useState<ShiftTimes>({ start: "", end: "" });
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const tmpId = useRef(0);
  // Backenddan kelgan parol — o'zgartirilmagan bo'lsa qayta yuborilmaydi
  // (yuborilsa operator sessiyasi bekor bo'lib, tizimdan chiqib ketadi).
  const initialPassword = useRef("");

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

  const clearErr = (k: keyof FieldErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function validate(): boolean {
    const next: FieldErrors = {};
    const n = name.trim();
    if (!n) next.name = t("sm.err.name");
    else if (n.split(/\s+/).length < 2) next.name = t("sm.err.surname");
    const em = email.trim();
    if (!em) next.email = t("sm.err.email");
    else if (!EMAIL_RE.test(em)) next.email = t("sm.err.emailBad");
    // Yangi xodimda parol majburiy; tahrirda faqat o'zgartirilsa tekshiriladi.
    if (isNew) {
      if (!password.trim()) next.password = t("sm.err.password");
      else if (password.length < MIN_PASSWORD) next.password = t("sm.err.passwordShort", { n: MIN_PASSWORD });
    } else if (password && password !== initialPassword.current && password.length < MIN_PASSWORD) {
      next.password = t("sm.err.passwordShort", { n: MIN_PASSWORD });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const addScript = () => setScripts((s) => [...s, { id: `tmp-${tmpId.current++}`, title: "", enabled: true }]);
  const updateScript = (id: string, patch: Partial<ScriptItem>) => setScripts((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeScript = (id: string) => setScripts((s) => s.filter((x) => x.id !== id));

  async function handleSave() {
    if (saving) return;
    if (!validate()) return;
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
        const pwChanged = password.trim() !== "" && password !== initialPassword.current;
        await persistExtras(operator.id, { password: pwChanged ? password.trim() : undefined, shift, scripts: cleanScripts });
      }
      toast(isNew ? t("sm.toast.added") : t("sm.toast.updated"), "good");
      onSaved();
    } catch {
      setSaving(false); // panel ochiq qoladi — qayta urinish mumkin
      toast(t("sm.toast.saveError"), "bad");
    }
  }

  async function handleDelete() {
    if (!operator) return;
    setDeleting(true);
    try {
      await deleteEmployee(operator.id);
      toast(t("sm.toast.deleted"), "good");
      onSaved();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
      toast(t("sm.toast.deleteError"), "bad");
    }
  }

  return (
    <Drawer open onClose={onClose} width={560} label={isNew ? t("sm.new") : t("sm.editTitle")} testId="SM-EDITOR" initialFocusRef={nameRef}>
      <div className="border-b border-pn-border px-6 py-5">
        <OverlayHeader title={isNew ? t("sm.new") : t("sm.editTitle")} onClose={onClose} />
        {!isNew && <p className="mt-1 truncate text-[13px] text-pn-muted">{operator.email}</p>}
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          <Field label={t("sm.f.name")} icon="users" error={errors.name}>
            {(id) => (
              <TextInput
                id={id}
                ref={nameRef}
                value={name}
                error={!!errors.name}
                onChange={(e) => { setName(e.target.value); clearErr("name"); }}
                placeholder="Dilnoza Karimova"
                autoComplete="off"
                data-testid="SM-F-name"
              />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t("sm.f.phone")} icon="phone">
              {(id) => <TextInput id={id} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" mono />}
            </Field>
            <Field label={t("sm.f.email")} icon="mail" error={errors.email}>
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  value={email}
                  error={!!errors.email}
                  onChange={(e) => { setEmail(e.target.value); clearErr("email"); }}
                  placeholder="operator@company.uz"
                  autoComplete="off"
                  data-testid="SM-F-email"
                />
              )}
            </Field>
          </div>
          <Field label={t("sm.f.password")} icon="lock" error={errors.password} hint={isNew ? undefined : t("sm.f.passwordHint")}>
            {(id) => (
              <TextInput
                id={id}
                type={showPassword ? "text" : "password"}
                value={password}
                error={!!errors.password}
                onChange={(e) => { setPassword(e.target.value); clearErr("password"); }}
                placeholder={t("sm.f.passwordPh", { n: MIN_PASSWORD })}
                autoComplete="new-password"
                mono
                data-testid="SM-F-password"
                right={
                  <IconButton
                    icon={showPassword ? "eyeOff" : "eye"}
                    label={showPassword ? t("sm.f.hidePw") : t("sm.f.showPw")}
                    size={38}
                    tone="ghost"
                    className="border-transparent!"
                    onClick={() => setShowPassword((v) => !v)}
                  />
                }
              />
            )}
          </Field>
          <Field label={t("sm.f.shift")} icon="clock">
            {(id) => (
              <div className="flex items-center gap-3">
                <TextInput id={id} type="time" value={shift.start} onChange={(e) => setShift((s) => ({ ...s, start: e.target.value }))} aria-label={t("sm.f.shiftStart")} mono />
                <span className="text-pn-subtle">—</span>
                <TextInput type="time" value={shift.end} onChange={(e) => setShift((s) => ({ ...s, end: e.target.value }))} aria-label={t("sm.f.shiftEnd")} mono />
              </div>
            )}
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="pn-section-label flex items-center gap-2 text-pn-muted">
                <Icon name="layers" size={14} /> {t("sm.f.scripts")}
              </span>
              <Button variant="link" icon="plus" onClick={addScript} testId="SM-SCRIPT-ADD">{t("sm.f.addScript")}</Button>
            </div>
            {scripts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-pn-border-3 py-5 text-center text-[13px] text-pn-subtle">{t("sm.f.noScripts")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {scripts.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-pn-border-2 bg-pn-field py-1 pl-3 pr-1">
                    <CheckBox checked={s.enabled} onChange={(v) => updateScript(s.id, { enabled: v })} label={t("sm.f.scriptOn")} />
                    <input
                      value={s.title}
                      onChange={(e) => updateScript(s.id, { title: e.target.value })}
                      placeholder={t("sm.f.scriptPh")}
                      aria-label={t("sm.f.scriptPh")}
                      className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-pn-text outline-none placeholder:text-pn-subtle"
                    />
                    <IconButton icon="trash" label={t("sm.f.scriptDel")} size={38} tone="ghost" className="border-transparent! hover:text-pn-bad!" onClick={() => removeScript(s.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-pn-border px-6 py-4">
          {!isNew && (
            <IconButton icon="trash" label={t("sm.delete")} tone="ghost" className="hover:text-pn-bad!" onClick={() => setConfirmDelete(true)} testId="SM-DELETE" />
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" className="flex-1" loading={saving} disabled={saving} testId="SM-SAVE">
            {saving ? t("sm.saving") : t("sm.save")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title={t("sm.delete")}
        message={t("sm.deleteConfirm", { name: operator?.name ?? "" })}
        confirmLabel={t("sm.deleteYes")}
        cancelLabel={t("sm.no")}
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
        testId="SM-CONFIRM"
      />
    </Drawer>
  );
}
