import type { Metadata } from "next";
import { CriteriaPage } from "../../../pulse/pages/criteria/CriteriaPage";

/* Baholash mezonlari — Pulse Noir (2026-10-14). Avval eski CriteriaView (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Baholash mezonlari" };

export default function Page() {
  return <CriteriaPage />;
}
