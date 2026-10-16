import { redirect } from "next/navigation";

/* Operatorlar bo'limi olib tashlandi (2026-10-16, foydalanuvchi talabi):
 * kunlik ko'rsatkichlar — Xodimlar statistikasida, akkauntlar — Xodimlarni
 * boshqarishda, amoCRM menejerlari — CRM ulanishi sahifasida. Eski havola
 * Xodimlar statistikasiga yo'naltiriladi. */
export default function Page() {
  redirect("/dashboard/staff-stats");
}
