import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { AnalysisStatusView } from "../../../components/AnalysisStatusView";

/* Tahlil holati — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Tahlil holati" };

export default function Page() {
  return (
    <LegacyFrame>
      <AnalysisStatusView />
    </LegacyFrame>
  );
}
