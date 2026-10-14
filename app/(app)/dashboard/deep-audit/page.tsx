import type { Metadata } from "next";
import { DeepPage } from "../../../pulse/pages/deep/DeepPage";

/* Chuqur tahlil — Pulse Noir (2026-10-14). Avval eski DeepAuditView
 * (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Chuqur tahlil" };

export default function Page() {
  return <DeepPage />;
}
