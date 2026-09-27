import type { Metadata } from "next";
import { LegacyFrame } from "../../pulse/shell/LegacyFrame";
import { AnalyticsView } from "../../components/AnalyticsView";

/* Analitika — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Analitika" };

export default function Page() {
  return (
    <LegacyFrame>
      <AnalyticsView />
    </LegacyFrame>
  );
}
