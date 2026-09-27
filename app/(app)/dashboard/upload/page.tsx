import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { UploadView } from "../../../components/views";

/* Audio yuklash — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Audio yuklash" };

export default function Page() {
  return (
    <LegacyFrame>
      <UploadView />
    </LegacyFrame>
  );
}
