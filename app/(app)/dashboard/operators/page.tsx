import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { ManagersDashboard } from "../../../components/ManagersDashboard";

/* Operatorlar — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Operatorlar" };

export default function Page() {
  return (
    <LegacyFrame>
      <ManagersDashboard />
    </LegacyFrame>
  );
}
