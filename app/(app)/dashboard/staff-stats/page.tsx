import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { StaffStatsView } from "../../../components/StaffStatsView";

/* Xodimlar statistikasi — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Xodimlar statistikasi" };

export default function Page() {
  return (
    <LegacyFrame>
      <StaffStatsView />
    </LegacyFrame>
  );
}
