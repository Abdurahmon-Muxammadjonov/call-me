import type { Metadata } from "next";
import { OperatorsPage } from "../../../pulse/pages/operators/OperatorsPage";

/* Operatorlar — Pulse Noir (2026-10-14). Avval eski ManagersDashboard
 * (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Operatorlar" };

export default function Page() {
  return <OperatorsPage />;
}
