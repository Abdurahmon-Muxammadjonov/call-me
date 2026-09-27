"use client";

/* Komponent doimiy Pulse qobig'i ichidami? Eski sozlamalar sahifalari
 * (SettingsShell) qobiq ichida o'z sarlavha panelini chizmaydi. */

import { createContext, useContext } from "react";

export const InPulseShellContext = createContext(false);

export function useInPulseShell(): boolean {
  return useContext(InPulseShellContext);
}
