import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { DeepAuditView } from "../../../components/views";

/* Chuqur tahlil — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Chuqur tahlil" };

export default function Page() {
  return (
    <LegacyFrame>
      <DeepAuditView />
    </LegacyFrame>
  );
}
