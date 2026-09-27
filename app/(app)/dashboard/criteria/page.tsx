import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { CriteriaView } from "../../../components/views";

/* Baholash mezonlari — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Baholash mezonlari" };

export default function Page() {
  return (
    <LegacyFrame>
      <CriteriaView />
    </LegacyFrame>
  );
}
