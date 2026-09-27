import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { ManagementView } from "../../../components/ManagementView";

/* Boshqaruv paneli — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Boshqaruv paneli" };

export default function Page() {
  return (
    <LegacyFrame>
      <ManagementView />
    </LegacyFrame>
  );
}
