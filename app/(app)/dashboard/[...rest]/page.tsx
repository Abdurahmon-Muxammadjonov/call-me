import { redirect } from "next/navigation";

/* Noma'lum /dashboard/<x> — eski catch-all kabi Analitikaga (bosh bo'lim). */
export default function UnknownSection(): never {
  redirect("/dashboard");
}
