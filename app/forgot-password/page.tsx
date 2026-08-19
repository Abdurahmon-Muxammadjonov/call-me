"use client";

import Link from "next/link";
import { Icons } from "../components/Icons";
import { AuthShell } from "../components/auth/AuthShell";
import { CONTACT_PHONE_TEL, CONTACT_PHONE_DISPLAY } from "../lib/contact";

/* There's no self-service password reset yet — per PROMPT_BACKEND_AUTH.md,
 * passwords are set/rotated by an admin, not emailed reset links. This
 * page is honest about that instead of faking a "check your email" flow
 * that doesn't actually do anything. */
export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="login">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand-blue dark:bg-blue-500/10 dark:text-brand-teal">
          <Icons.lock className="h-7 w-7" />
        </span>
        <h1 className="font-heading mt-5 text-2xl font-bold text-slate-900 dark:text-white">Parolni tiklash</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Parolingizni faqat kompaniyangiz administratori tiklay oladi. Quyidagi raqam orqali bog&apos;laning —
          administratoringiz sizga yangi parol beradi.
        </p>

        <a
          href={`tel:${CONTACT_PHONE_TEL}`}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light"
        >
          <Icons.phone className="h-4 w-4" />
          {CONTACT_PHONE_DISPLAY}
        </a>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-blue-light dark:text-brand-teal">
            ← Tizimga kirishga qaytish
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
