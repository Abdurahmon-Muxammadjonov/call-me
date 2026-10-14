import type { Metadata } from "next";
import { StaffManagePage } from "../../../pulse/pages/staffmanage/StaffManagePage";

/* Xodimlarni boshqarish — Pulse Noir (2026-10-14). Avval eski StaffManager (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Xodimlarni boshqarish" };

export default function Page() {
  return <StaffManagePage />;
}
