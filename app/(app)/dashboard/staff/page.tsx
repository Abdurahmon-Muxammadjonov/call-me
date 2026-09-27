import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { StaffManager } from "../../../components/StaffManager";

/* Xodimlarni boshqarish — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Xodimlarni boshqarish" };

export default function Page() {
  return (
    <LegacyFrame>
      <StaffManager />
    </LegacyFrame>
  );
}
