import type { Metadata } from "next";
import { AmoCrmPage } from "../../../pulse/pages/amocrm/AmoCrmPage";

/* amoCRM ulanishi — Pulse Noir (2026-10-14). Avval eski AmoCrmView (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "CRM ulanishi" };

export default function Page() {
  return <AmoCrmPage />;
}
