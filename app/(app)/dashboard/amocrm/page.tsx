import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { AmoCrmView } from "../../../components/views";

/* amoCRM ulanishi — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "amoCRM ulanishi" };

export default function Page() {
  return (
    <LegacyFrame>
      <AmoCrmView />
    </LegacyFrame>
  );
}
