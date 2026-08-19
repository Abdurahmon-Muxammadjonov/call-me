"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { Icons } from "../Icons";
import { CodeInput } from "./CodeInput";
import { registerEmployee } from "../../lib/register";
import { sessionFromUser, type Session } from "../../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const CODE_LENGTH = 9;

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  code?: string;
}

/* /register — an employee joins an existing company via a 9-character
 * invite code (see RegisterCompanyForm, which generates one). */
export function RegisterForm({ onRegistered }: { onRegistered: (session: Session) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formErr, setFormErr] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (!name.trim() || name.trim().split(/\s+/).length < 2) {
      next.name = "To'liq ism (ism + familiya) kiriting.";
    }
    if (!email.trim()) {
      next.email = "Email kiriting.";
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = "Email formati noto'g'ri.";
    }
    if (!password) {
      next.password = "Parol kiriting.";
    } else if (password.length < MIN_PASSWORD) {
      next.password = `Parol kamida ${MIN_PASSWORD} belgidan iborat bo'lsin.`;
    }
    if (confirm !== password) {
      next.confirm = "Parollar mos kelmadi.";
    }
    if (code.length !== CODE_LENGTH) {
      next.code = `Kompaniya kodi ${CODE_LENGTH} ta belgidan iborat bo'lishi kerak.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    setFormErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await registerEmployee({ name: name.trim(), email: email.trim(), password, companyCode: code });
      onRegistered(sessionFromUser(user));
    } catch (err) {
      setFormErr((err as Error).message);
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-white";
  const okBorder = "border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 dark:border-white/15";
  const errBorder = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Jamoaga qo&apos;shiling</h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Administratoringiz sizga bergan kompaniya kodi bilan ro&apos;yxatdan o&apos;ting.
      </p>

      {formErr && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {formErr}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            To&apos;liq ism
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((s) => ({ ...s, name: undefined }));
            }}
            placeholder="Aziz Karimov"
            autoComplete="name"
            className={`${field} ${errors.name ? errBorder : okBorder}`}
          />
          {errors.name && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.name}</p>}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Parolni tasdiqlang
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (errors.confirm) setErrors((s) => ({ ...s, confirm: undefined }));
              }}
              placeholder="Parolni qayta kiriting"
              autoComplete="new-password"
              className={`${field} ${errors.confirm ? errBorder : okBorder}`}
            />
            {errors.confirm && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.confirm}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Kompaniya kodi
          </label>
          <CodeInput
            length={CODE_LENGTH}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (errors.code) setErrors((s) => ({ ...s, code: undefined }));
            }}
            error={Boolean(errors.code)}
          />
          {errors.code && <p className="mt-1.5 text-xs font-medium text-rose-500">{errors.code}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Ro&apos;yxatdan o&apos;tilmoqda...
            </>
          ) : (
            "Ro'yxatdan o'tish"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
          Tizimga kiring
        </Link>
      </p>
    </div>
  );
}
