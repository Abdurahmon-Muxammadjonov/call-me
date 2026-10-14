import type { Metadata } from "next";
import { UploadPage } from "../../../pulse/pages/upload/UploadPage";

/* Audio yuklash — Pulse Noir (2026-10-14). Avval eski UploadView (LegacyFrame ichida) edi. */
export const metadata: Metadata = { title: "Audio yuklash" };

export default function Page() {
  return <UploadPage />;
}
