import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { ComparisonView } from "../../../components/ComparisonView";

/* Solishtirish paneli — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Solishtirish paneli" };

export default function Page() {
  return (
    <LegacyFrame>
      <ComparisonView />
    </LegacyFrame>
  );
}
