import type { Metadata } from "next";
import { AnalyticsPage } from "../../pulse/pages/analytics/AnalyticsPage";

/* Analitika — Pulse Noir (2-bosqich). */
export const metadata: Metadata = { title: "Analitika" };

export default function Page() {
  return <AnalyticsPage />;
}
