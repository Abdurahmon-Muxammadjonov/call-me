import type { Metadata } from "next";
import { CategoriesPage } from "../../../pulse/pages/criteria/CategoriesPage";

/* Mezon kategoriyalari — Pulse Noir (2026-10-14). Avval eski CategoriesView (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Mezon kategoriyalari" };

export default function Page() {
  return <CategoriesPage />;
}
