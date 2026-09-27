import type { Metadata } from "next";
import { LegacyFrame } from "../../../pulse/shell/LegacyFrame";
import { CategoriesView } from "../../../components/views";

/* Mezon kategoriyalari — hali Pulse Noir'ga ko'chirilmagan: eski ko'rinish yangi
 * doimiy qobiq ichida (qarang pulse/shell/LegacyFrame.tsx). */
export const metadata: Metadata = { title: "Mezon kategoriyalari" };

export default function Page() {
  return (
    <LegacyFrame>
      <CategoriesView />
    </LegacyFrame>
  );
}
