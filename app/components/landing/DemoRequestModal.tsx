"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { Icons } from "../Icons";
import { closeDemoModal, useDemoModalOpen } from "./demoModal";

const CRM_OPTIONS = ["amoCRM", "Bitrix24", "HubSpot", "Salesforce", "Boshqa / Yo'q"];

type Status = "idle" | "submitting" | "success" | "error";

/* Outer component only tracks open/closed; the form itself lives in
 * DemoRequestForm, which is unmounted on close and freshly mounted on
 * open — giving each open a clean-slate form "for free" via React's own
 * mount lifecycle, instead of an effect that resets state (which the
 * lint rules here flag as a cascading-render anti-pattern). */
export function DemoRequestModal() {
  const open = useDemoModalOpen();
  if (!open) return null;
  return <DemoRequestForm />;
}

function DemoRequestForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [crm, setCrm] = useState(CRM_OPTIONS[0] ?? "");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDemoModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit(e: SyntheticEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), crm }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div onClick={closeDemoModal} className="absolute inset-0 animate-fade-in bg-slate-900/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-7 shadow-2xl">
        <button
          onClick={closeDemoModal}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Yopish"
        >
          <Icons.close className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Icons.check className="h-6 w-6" />
            </span>
            <h3 className="font-heading mt-4 text-lg font-bold text-slate-900">So&apos;rovingiz qabul qilindi</h3>
            <p className="mt-1.5 text-sm text-slate-500">Tez orada siz bilan bog&apos;lanamiz.</p>
            <button
              onClick={closeDemoModal}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-blue-light"
            >
              Yopish
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900">Demo so&apos;rash</h3>
              <p className="mt-1 text-sm text-slate-500">Ma&apos;lumotlaringizni qoldiring — siz bilan bog&apos;lanamiz.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ism familiya
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aziz Karimov"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Telefon raqami
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 000 00 00"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Qaysi CRM/tizimga qo&apos;yiladi
              </label>
              <select
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              >
                {CRM_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {status === "error" && (
              <p className="text-sm font-medium text-rose-500">Xatolik yuz berdi. Qayta urinib ko&apos;ring.</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
