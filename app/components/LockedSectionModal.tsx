"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { Icons } from "./Icons";
import { Portal } from "./Portal";
import { useSession } from "../lib/auth";
import { useSections, unlockSection } from "../lib/sections";
import { getTelegramDeeplink } from "../lib/telegram";

export function LockedSectionModal({
  open,
  sectionKey,
  sectionLabel,
  inPlan,
  onClose,
}: {
  open: boolean;
  sectionKey: string;
  sectionLabel: string;
  /* true  → already part of the tariff, just needs a code ("Kod olish" +
   *         code-entry form).
   * false → not part of the current tariff at all ("Tarifni oshirish"). */
  inPlan: boolean;
  onClose: () => void;
}) {
  const session = useSession();
  const { markUnlocked, refetch } = useSections();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  // No reset-on-open effect needed: AppShell only mounts this component
  // while `lockedTab` is set and fully unmounts it on close (see the
  // `{lockedTab && ... && <LockedSectionModal .../>}` guard), so every
  // open is already a fresh mount with fresh initial state above.

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function openDeeplink(purpose: "get_code" | "upgrade") {
    setLinkLoading(true);
    setLinkError("");
    try {
      const url = await getTelegramDeeplink(session?.token, purpose);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setLinkError((err as Error).message);
    } finally {
      setLinkLoading(false);
    }
  }

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Kodni kiriting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await unlockSection(session?.token, sectionKey, code);
      // Instant local unlock so the padlock disappears with no flash of
      // "still locked", then a background refetch reconciles with the
      // backend's actual state (in case anything else changed too).
      markUnlocked(sectionKey);
      refetch();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div onClick={onClose} className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" />
        <div className="glass glow-ring relative w-full max-w-sm animate-slide-up rounded-2xl p-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Icons.lock className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-center text-lg font-bold text-slate-800 dark:text-slate-100">
            {inPlan ? "Bu bo'lim hali ochilmagan" : "Tarifni yangilash kerak"}
          </h3>
          <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-slate-400">
            {inPlan ? (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{sectionLabel}</span> tarifingizga
                kiradi, lekin hali ochilmagan. Kodni Telegram botdan oling va shu yerga kiriting.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{sectionLabel}</span> joriy
                tarifingizga kirmaydi. Kattaroq tarifga o&apos;ting.
              </>
            )}
          </p>

          {inPlan ? (
            <>
              <button
                type="button"
                onClick={() => openDeeplink("get_code")}
                disabled={linkLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-brand-blue-light"
              >
                <Icons.telegram className="h-4 w-4 shrink-0" />
                {linkLoading ? "Ochilmoqda..." : "Kod olish (Telegram)"}
              </button>
              {linkError && <p className="mt-2 text-center text-xs font-medium text-rose-500">{linkError}</p>}

              <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Ochish kodi"
                  autoFocus
                  autoComplete="off"
                  aria-invalid={Boolean(error)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-center font-mono-stat text-sm tracking-widest text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/5 dark:text-white ${
                    error
                      ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20"
                      : "border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 dark:border-white/15"
                  }`}
                />
                {error && (
                  <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500">
                    <Icons.close className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Tekshirilmoqda..." : "Ochish"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => openDeeplink("upgrade")}
                disabled={linkLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icons.telegram className="h-4 w-4 shrink-0" />
                {linkLoading ? "Ochilmoqda..." : "Tarifni oshirish (Telegram)"}
              </button>
              {linkError && <p className="text-center text-xs font-medium text-rose-500">{linkError}</p>}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
              >
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
