"use client";

/* AI yordamchi (2026-10-20) — POST /api/assistant/ask (backend
 * lib/assistant.ts: GPT kerakli ma'lumotni o'zi so'raydi — qo'ng'iroqlar,
 * xodimlar, audio xulosalari, lid sifati, amoCRM sotuvlari). */

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface ChatMsg { role: "user" | "assistant"; content: string; error?: boolean }

export function useAskAssistant() {
  return useMutation({
    mutationFn: (messages: ChatMsg[]) =>
      apiFetch<{ answer: string }>("/api/assistant/ask", {
        method: "POST",
        body: { messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) },
      }),
  });
}
