"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { Icons } from "../Icons";
import { authenticate, type Session } from "../../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [formErr, setFormErr] = useState("");

  function validate(): boolean {
    let ok = true;
    const e = email.trim();
    if (!e) {
      setEmailErr("Email kiriting.");
      ok = false;
    } else if (!EMAIL_RE.test(e)) {
      setEmailErr("Email formati noto'g'ri.");
      ok = false;
    } else {
      setEmailErr("");
    }
    if (!password) {
      setPassErr("Parol kiriting.");
      ok = false;
    } else {
      setPassErr("");
    }
    return ok;
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    setFormErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const session = await authenticate(email.trim(), password);
      if (session) {
        onLogin(session);
      } else {
        setFormErr("Email yoki parol noto'g'ri.");
        setLoading(false);
      }
    } catch {
      setFormErr("Serverga ulanib bo'lmadi. Aloqani tekshirib, qayta urining.");
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-white";
  const okBorder = "border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 dark:border-white/15";
  const errBorder = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20";

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Xush kelibsiz</h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Hisobingizga kirish uchun ma&apos;lumotlaringizni kiriting</p>

      {formErr && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-300/60 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <Icons.close className="h-4 w-4 shrink-0" />
          {formErr}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailErr) setEmailErr("");
            }}
            placeholder="email@salespulse.uz"
            autoComplete="email"
            aria-invalid={Boolean(emailErr)}
            className={`${field} ${emailErr ? errBorder : okBorder}`}
          />
          {emailErr && <p className="mt-1.5 text-xs font-medium text-rose-500">{emailErr}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parol</label>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
              Parolni unutdingizmi?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passErr) setPassErr("");
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(passErr)}
              className={`${field} pr-11 ${passErr ? errBorder : okBorder}`}
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
          {passErr && <p className="mt-1.5 text-xs font-medium text-rose-500">{passErr}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Tekshirilmoqda...
            </>
          ) : (
            "Tizimga kirish"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Kompaniyangiz yo&apos;qmi?{" "}
        <Link href="/register-company" className="font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        Kompaniya kodingiz bormi?{" "}
        <Link href="/register" className="font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
          Jamoaga qo&apos;shiling
        </Link>
      </p>
    </div>
  );
}
