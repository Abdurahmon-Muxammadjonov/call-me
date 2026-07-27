"use client";

import { useState, type SyntheticEvent } from "react";
import { Icons } from "./Icons";
import { Logo, LocaleToggle } from "./ui";
import { authenticate, type Session } from "../lib/auth";
import { useT } from "../lib/i18n";

/* =====================================================================
 * LoginScreen — secure-by-design.
 *
 *   1. NO credentials are hardcoded/checked in the frontend.
 *   2. Correctness of email/password is decided ONLY by the backend.
 *   3. The frontend does light validation only (non-empty, password ≥ 8).
 *   4. On submit, inputs are collected and POSTed to the backend API
 *      (via authenticate → POST /users/login).
 *   5. The backend's response routes the user: a Session → onLogin (redirect
 *      to the cabinet), 401/400 → "wrong credentials", network/5xx →
 *      "server unreachable".
 * ===================================================================== */

const MIN_PASSWORD = 6;
// Simple shape check only — the backend is the source of truth.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field-level validation messages (client-side, pre-submit).
  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  // Whole-form error from the backend (wrong creds) or the network.
  const [formErr, setFormErr] = useState("");
  // bump a key on each failed submit so the shake/toast animations re-run
  const [errKey, setErrKey] = useState(0);

  /* ---------- 3. Light client-side validation ---------- */
  function validate(): boolean {
    let ok = true;

    const e = email.trim();
    if (!e) {
      setEmailErr(t("login.emailRequired"));
      ok = false;
    } else if (!EMAIL_RE.test(e)) {
      setEmailErr(t("login.emailInvalid"));
      ok = false;
    } else {
      setEmailErr("");
    }

    if (!password) {
      setPassErr(t("login.passwordRequired"));
      ok = false;
    } else if (password.length < MIN_PASSWORD) {
      setPassErr(t("login.passwordTooShort", { min: MIN_PASSWORD }));
      ok = false;
    } else {
      setPassErr("");
    }

    return ok;
  }

  function fail(message: string) {
    setFormErr(message);
    setErrKey((k) => k + 1);
    setLoading(false);
  }

  /* ---------- 4 & 5. Submit → backend → route by response ---------- */
  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    setFormErr("");
    if (!validate()) return; // bo'sh / qisqa bo'lsa — so'rov yubormaymiz

    setLoading(true);
    try {
      // Collect inputs and POST them to the backend. Correctness is the
      // backend's job — we only react to its answer.
      const session = await authenticate(email.trim(), password);
      if (session) {
        onLogin(session); // ✅ success → parent redirects to the cabinet
      } else {
        fail(t("login.wrongCredentials")); // backend 401/400
      }
    } catch {
      fail(t("login.serverUnreachable")); // network/5xx
    }
  }

  const inputBase =
    "w-full rounded-xl border bg-white/70 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 focus:ring-2 dark:bg-slate-800/50 dark:text-slate-100";
  const okBorder =
    "border-slate-200/70 focus:border-indigo-400 focus:ring-indigo-400/30 dark:border-slate-700/60 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/30";
  const errBorder = "border-rose-400 focus:border-rose-400 focus:ring-rose-400/30";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 dark:bg-[#0a0e1a]">
      {/* Understated ambient background — a single static wash, no motion */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/10" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-slate-400/10 blur-3xl dark:bg-slate-500/5" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LocaleToggle />
      </div>

      {/* Backend/network error toast */}
      {formErr && (
        <div key={`toast-${errKey}`} className="absolute left-1/2 top-6 z-20 -translate-x-1/2 animate-toast-in" role="alert">
          <div className="flex items-center gap-3 rounded-xl border border-rose-300/60 bg-rose-500/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(244,63,94,0.7)] backdrop-blur-md">
            <Icons.close className="h-4 w-4 shrink-0" />
            {formErr}
          </div>
        </div>
      )}

      <div
        key={`card-${errKey}`}
        className={`glass glow-ring relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl sm:p-10 ${
          formErr ? "animate-shake" : "animate-slide-up"
        }`}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {t("login.title")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("login.email")}
            </label>
            <div className="group relative">
              <Icons.mail
                className={`absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 transition-colors ${
                  emailErr ? "text-rose-400" : "text-slate-400 group-focus-within:text-indigo-500"
                }`}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailErr) setEmailErr("");
                }}
                placeholder={t("login.emailPlaceholder")}
                autoComplete="email"
                aria-invalid={Boolean(emailErr)}
                className={`${inputBase} ${emailErr ? errBorder : okBorder}`}
              />
            </div>
            {emailErr && <p className="mt-1.5 text-xs font-medium text-rose-500">{emailErr}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("login.password")}
            </label>
            <div className="group relative">
              <Icons.lock
                className={`absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 transition-colors ${
                  passErr ? "text-rose-400" : "text-slate-400 group-focus-within:text-indigo-500"
                }`}
              />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passErr) setPassErr("");
                }}
                placeholder={t("login.passwordPlaceholder")}
                autoComplete="current-password"
                aria-invalid={Boolean(passErr)}
                className={`${inputBase} pr-12 ${passErr ? errBorder : okBorder}`}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-indigo-500"
              >
                {showPass ? t("login.hide") : t("login.show")}
              </button>
            </div>
            {passErr && <p className="mt-1.5 text-xs font-medium text-rose-500">{passErr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md transition-colors duration-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t("login.submitting")}
              </>
            ) : (
              <>
                <Icons.lock className="h-4 w-4" />
                {t("login.submit")}
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          {t("login.footer")}
        </p>
      </div>
    </div>
  );
}
