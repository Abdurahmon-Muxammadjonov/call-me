"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { Icons } from "../Icons";
import { registerCompany } from "../../lib/register";
import { sessionFromUser, type Session } from "../../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

interface Errors {
  companyName?: string;
  ownerName?: string;
  email?: string;
  password?: string;
}

/* /register-company — creates a brand-new company + its owner account.
 * On success, does NOT redirect immediately: the generated invite code has
 * to be shown (and copyable) first, since the owner needs to hand it to
 * their team before it's of any use. `onSuccess` fires only once they
 * explicitly continue past that screen. */
export function RegisterCompanyForm({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formErr, setFormErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ session: Session; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (!companyName.trim()) next.companyName = "Kompaniya nomini kiriting.";
    if (!ownerName.trim() || ownerName.trim().split(/\s+/).length < 2) {
      next.ownerName = "To'liq ism (ism + familiya) kiriting.";
    }
    if (!email.trim()) next.email = "Email kiriting.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Email formati noto'g'ri.";
    if (!password) next.password = "Parol kiriting.";
    else if (password.length < MIN_PASSWORD) next.password = `Parol kamida ${MIN_PASSWORD} belgidan iborat bo'lsin.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    setFormErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { user, inviteCode } = await registerCompany({
        companyName: companyName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
      });
      // The person who starts a company is always its full admin,
      // regardless of whatever role string the backend happens to send.
      setResult({ session: { ...sessionFromUser(user), role: "director" }, inviteCode });
    } catch (err) {
      setFormErr((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is still selectable/visible */
    }
  }

  if (result) {
    return (
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Icons.check className="h-7 w-7" />
        </span>
        <h1 className="font-heading mt-5 text-2xl font-bold text-slate-900 dark:text-white">Kompaniya yaratildi</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Buni jamoangizga yuboring — ular shu kod bilan qo&apos;shiladi.</p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kompaniya kodi</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="font-mono-stat select-all text-2xl font-medium tracking-[0.2em] text-slate-900 dark:text-white">
              {result.inviteCode}
            </span>
            <button
              onClick={copyCode}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/15 dark:text-slate-300"
              aria-label="Nusxalash"
              title="Nusxalash"
            >
              {copied ? <Icons.check className="h-4 w-4 text-emerald-500" /> : <Icons.copy className="h-4 w-4" />}
            </button>
          </div>
          {copied && <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Nusxalandi!</p>}
        </div>

        <button
          onClick={() => onSuccess(result.session)}
          className="mt-6 w-full rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light"
        >
          Dashboard&apos;ga o&apos;tish
        </button>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-white";
  const okBorder = "border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 dark:border-white/15";
  const errBorder = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Kompaniyangizni ro&apos;yxatdan o&apos;tkazing</h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Bir necha daqiqada boshlang — kredit karta talab qilinmaydi.</p>

      {formErr && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {formErr}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kompaniya nomi
          </label>
          <input
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (errors.companyName) setErrors((s) => ({ ...s, companyName: undefined }));
            }}
            placeholder="SalesPulse MChJ"
            className={`${field} ${errors.companyName ? errBorder : okBorder}`}
          />
          {errors.companyName && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.companyName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ismingiz
          </label>
          <input
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              if (errors.ownerName) setErrors((s) => ({ ...s, ownerName: undefined }));
            }}
            placeholder="Aziz Karimov"
            autoComplete="name"
            className={`${field} ${errors.ownerName ? errBorder : okBorder}`}
          />
          {errors.ownerName && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.ownerName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((s) => ({ ...s, email: undefined }));
            }}
            placeholder="email@salespulse.uz"
            autoComplete="email"
            className={`${field} ${errors.email ? errBorder : okBorder}`}
          />
          {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Parol
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((s) => ({ ...s, password: undefined }));
              }}
              placeholder="Kamida 8 belgi"
              autoComplete="new-password"
              className={`${field} pr-11 ${errors.password ? errBorder : okBorder}`}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPass ? "Parolni yashirish" : "Parolni ko'rsatish"}
            >
              {showPass ? <Icons.eyeOff className="h-4.5 w-4.5" /> : <Icons.eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Yaratilmoqda...
            </>
          ) : (
            "Kompaniya yaratish"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Kompaniya kodingiz bormi?{" "}
        <Link href="/register" className="font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
          Jamoaga qo&apos;shiling
        </Link>
      </p>
    </div>
  );
}
