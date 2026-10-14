import type { Metadata } from "next";
import { ControlPage } from "../../../pulse/pages/control/ControlPage";

/* Boshqaruv paneli — Pulse Noir (2026-10-14). Avval eski ManagementView
 * (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Boshqaruv paneli" };

export default function Page() {
  return <ControlPage />;
}
