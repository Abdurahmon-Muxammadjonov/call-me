import type { Metadata } from "next";
import { StatusPage } from "../../../pulse/pages/status/StatusPage";

/* Tahlil holati — Pulse Noir (2026-10-14). Avval eski AnalysisStatusView
 * (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Tahlil holati" };

export default function Page() {
  return <StatusPage />;
}
