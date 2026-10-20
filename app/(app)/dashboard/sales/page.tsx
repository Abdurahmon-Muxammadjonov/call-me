import type { Metadata } from "next";
import { SalesPage } from "../../../pulse/pages/sales/SalesPage";

/* Sotuv dashboardi — amoCRM (2026-10-20). */
export const metadata: Metadata = { title: "Sotuv" };

export default function Page() {
  return <SalesPage />;
}
