import { redirect } from "next/navigation";

/* KPI normalari bo'limi olib tashlandi (2026-10-16, foydalanuvchi talabi:
 * "KPI hisoblashni, bannerni, hammasini olib tashla"). Eski havola
 * Dashboard'ga yo'naltiriladi. Oldingi sahifa git tarixida. */
export default function Page() {
  redirect("/dashboard");
}
