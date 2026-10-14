import type { Metadata } from "next";
import { StaffPage } from "../../../pulse/pages/staff/StaffPage";

/* Xodimlar statistikasi — Pulse Noir (2026-10-14). Avval eski
 * StaffStatsView (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Xodimlar statistikasi" };

export default function Page() {
  return <StaffPage />;
}
