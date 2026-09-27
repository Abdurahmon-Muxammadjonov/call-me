import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { RecordingsView } from "../../../components/RecordingsView";

/* Audio yozuvlar — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Audio yozuvlar" };

export default function Page() {
  return (
    <LegacyFrame>
      <RecordingsView />
    </LegacyFrame>
  );
}
