"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsShell } from "../../components/settings/SettingsShell";
import { CompanyProvider, useCompany } from "../../lib/company";
import { useSession } from "../../lib/auth";
import { useHasRole } from "../../lib/useHasRole";
import { showToast } from "../../lib/toast";
import { ToastHost } from "../../components/ToastHost";
import { Icons } from "../../components/Icons";
import { Card, Skeleton } from "../../components/ui";
import { apiUrl, authHeaders } from "../../lib/api";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function BrandingContent() {
  const session = useSession();
  const canEdit = useHasRole(["director", "admin"]);
  const { company, loading, setCompany } = useCompany();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Revoke the object URL when it's replaced/unmounted so we don't leak.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickFile(f: File | null) {
    setFileErr("");
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFileErr("Faqat PNG, JPEG yoki WEBP formatidagi rasm yuklang.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileErr("Fayl hajmi 2MB dan oshmasligi kerak.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch(apiUrl("/company/logo"), {
        method: "POST",
        headers: authHeaders(session?.token), // Content-Type qo'lda qo'yilmaydi — brauzer multipart boundary'ni o'zi belgilaydi.
        body: form,
      });
      const json = (await res.json()) as { success: boolean; data?: { logo_url: string }; error?: string };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      // Darhol yangilanadi — reload shart emas.
      setCompany(company ? { ...company, logo_url: json.data.logo_url } : company);
      setFile(null);
      setPreview(null);
      showToast("Logotip yangilandi.", "success");
    } catch (e) {
      showToast((e as Error).message || "Logotipni yuklab bo'lmadi.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setDeleting(true);
    try {
      const res = await fetch(apiUrl("/company/logo"), {
        method: "DELETE",
        headers: authHeaders(session?.token),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setCompany(company ? { ...company, logo_url: null } : company);
      showToast("Logotip o'chirildi.", "success");
    } catch (e) {
      showToast((e as Error).message || "Logotipni o'chirib bo'lmadi.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (!canEdit) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
          <Icons.lock className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">Ruxsat yo&apos;q</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Bu sahifa faqat kompaniya direktori/administratori uchun.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Joriy logotip</h2>
        <div className="mt-4 flex items-center gap-5">
          {loading ? (
            <Skeleton className="h-20 w-20 rounded-2xl" />
          ) : company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external logo URL
            <img src={company.logo_url} alt={company.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Icons.building className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{company?.name ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {company?.logo_url ? "Yuklangan logotip" : "Hozircha logotip yuklanmagan — bosh harflar bilan avtomatik avatar ko'rsatiladi."}
            </p>
            {company?.logo_url && (
              <button
                onClick={removeLogo}
                disabled={deleting}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300/60 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                {deleting ? "O'chirilmoqda..." : "Logotipni o'chirish"}
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Yangi logotip yuklash</h2>
        <p className="mt-1 text-xs text-slate-400">PNG, JPEG yoki WEBP — maksimal 2MB.</p>

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-4 text-left transition-colors hover:border-brand-blue dark:border-slate-700"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={preview} alt="Tanlangan fayl" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Icons.upload className="h-6 w-6" />
            </span>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {file ? file.name : "Fayl tanlash uchun bosing"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        {fileErr && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-500">
            <Icons.close className="h-3.5 w-3.5 shrink-0" />
            {fileErr}
          </p>
        )}

        <button
          onClick={upload}
          disabled={!file || uploading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-bold text-white transition-colors hover:bg-brand-blue-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Yuklanmoqda...
            </>
          ) : (
            "Logotipni saqlash"
          )}
        </button>
      </Card>
    </div>
  );
}

export default function BrandingSettingsPage() {
  const router = useRouter();
  const session = useSession();
  const canEdit = useHasRole(["director", "admin"]);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    // Xohlagan URL orqali to'g'ridan-to'g'ri kirishga urinsa ham —
    // ruxsatsiz rol dashboard'ga qaytariladi, sahifa hech qachon ko'rinmaydi.
    if (!canEdit) {
      router.replace(session.role === "director" ? "/dashboard" : "/cabinet");
    }
  }, [session, canEdit, router]);

  if (!session || !canEdit) return null;

  return (
    <CompanyProvider>
      <SettingsShell title="Brend sozlamalari" subtitle="Kompaniyangiz logotipini boshqaring">
        <BrandingContent />
      </SettingsShell>
      <ToastHost />
    </CompanyProvider>
  );
}
