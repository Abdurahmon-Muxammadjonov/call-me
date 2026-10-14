import type { Metadata } from "next";
import { AudioPage } from "../../../pulse/pages/calls/AudioPage";

/* Audio yozuvlar — Pulse Noir (2026-10-14). Avval eski RecordingsView
 * (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Audio yozuvlar" };

export default function Page() {
  return <AudioPage />;
}
