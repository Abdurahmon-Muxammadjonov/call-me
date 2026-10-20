"use client";

/* AI YORDAMCHI — har sahifada o'ng pastda kichik tugma (2026-10-20,
 * foydalanuvchi talabi). Bosilsa o'ng pastda 400×560 yumaloq oyna (sarlavha — SalesAi) (sahifani
 * to'smaydi, layout'da — sahifa almashsa ham yopilmaydi): messenjer kabi yozishuv.
 * Savollar: "bugun nechta audio tushdi", "nechtasi muvaffaqiyatli", "qaysi
 * xodim zo'r ishlayapti", "audiolardan xulosa" — javob GPT'dan, faqat shu
 * kompaniya ma'lumoti bo'yicha. Faqat direktor/admin. Yozishuv shu tabda
 * (sessionStorage) saqlanadi — sahifa almashsa yo'qolmaydi. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePT } from "../i18n";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Spinner } from "../ui/primitives";
import { TextArea } from "../ui/form";
import { Icon } from "../ui/Icon";
import { useMe } from "../data/me";
import { useAskAssistant, type ChatMsg } from "../data/assistant";

const KEY = "pn-assistant-chat";

/* GPT javobidagi oddiy markdown: **qalin**, ro'yxat qatorlari, sarlavha. */
function Rich({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p));
  return (
    <div className="flex flex-col gap-1">
      {text.split("\n").map((line, i) => {
        const l = line.trimEnd();
        if (!l.trim()) return <span key={i} className="h-1" />;
        const li = /^\s*([-•*]|\d+[.)])\s+(.*)$/.exec(l);
        if (li) return <span key={i} className="flex gap-2 pl-1"><span className="shrink-0 text-pn-muted">{/\d/.test(li[1]) ? li[1] : "•"}</span><span>{inline(li[2])}</span></span>;
        const h = /^#{1,4}\s+(.*)$/.exec(l);
        if (h) return <b key={i} className="mt-1">{inline(h[1])}</b>;
        return <span key={i}>{inline(l)}</span>;
      })}
    </div>
  );
}

export function AssistantButton() {
  const t = usePT();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [log, setLog] = useState<ChatMsg[]>([]);
  const ask = useAskAssistant();
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canUse = me?.user.role === "director" || me?.user.role === "admin" || me?.user.role === "owner";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tab xotirasidan bir marta
      if (raw) setLog((JSON.parse(raw) as ChatMsg[]).slice(-40));
    } catch { /* bo'sh boshlanadi */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(log.slice(-40))); } catch { /* saqlanmasa ham ishlaydi */ }
    end.current?.scrollIntoView({ block: "end" });
  }, [log, open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!canUse) return null;

  const send = (q: string) => {
    const question = q.trim();
    if (!question || ask.isPending) return;
    const next: ChatMsg[] = [...log, { role: "user", content: question }];
    setLog(next);
    setText("");
    ask.mutate(next, {
      onSuccess: (r) => setLog((l) => [...l, { role: "assistant", content: r.answer || "—" }]),
      onError: (e) => setLog((l) => [...l, { role: "assistant", content: String((e as Error).message), error: true }]),
    });
  };
  const examples = [t("ast.ex1"), t("ast.ex2"), t("ast.ex3"), t("ast.ex4")];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="SalesAi"
            data-testid="AI-ASSIST"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-[148px] right-5 z-50 flex h-[min(560px,calc(100dvh-180px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border border-pn-border-3 bg-pn-panel text-pn-text shadow-2xl max-lg:bottom-[136px] max-lg:right-4"
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-pn-border-2 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pn-accent text-pn-accent-ink"><Icon name="sparkle" size={15} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">SalesAi</span>
                  <span className="block truncate text-[11px] text-pn-muted">{t("ast.sub")}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {log.length > 0 && <Button variant="link" onClick={() => setLog([])} testId="AI-ASSIST-clear">{t("ast.clear")}</Button>}
                <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="pn-press grid h-8 w-8 place-items-center rounded-full text-pn-muted hover:bg-pn-panel-2 hover:text-pn-text">
                  <Icon name="close" size={15} />
                </button>
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
              {log.length === 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-pn-muted">{t("ast.intro")}</p>
                  {examples.map((e) => (
                    <button key={e} type="button" onClick={() => send(e)} className="pn-press rounded-xl border border-pn-border-2 px-3 py-2 text-left text-[13px] hover:bg-pn-panel-2">{e}</button>
                  ))}
                </div>
              )}
              {log.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-pn-accent px-3 py-2 text-[13px] text-pn-accent-ink">{m.content}</p>
                ) : (
                  <div key={i} className={`max-w-[92%] self-start rounded-2xl rounded-bl-md bg-pn-panel-2 px-3 py-2 text-[13px] leading-relaxed ${m.error ? "text-pn-bad-text" : ""}`}>
                    {m.error ? m.content : <Rich text={m.content} />}
                  </div>
                )
              )}
              {ask.isPending && <span className="flex items-center gap-2 self-start text-[13px] text-pn-muted"><Spinner /> {t("ast.thinking")}</span>}
              <div ref={end} />
            </div>
            <form className="flex items-end gap-2 border-t border-pn-border-2 px-3 py-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <TextArea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={1}
                placeholder={t("ast.ph")}
                className="h-11! max-h-28 min-h-11! resize-none py-[10px]! leading-snug!"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                data-testid="AI-ASSIST-input"
              />
              <Button variant="primary" type="submit" compact disabled={!text.trim()} loading={ask.isPending} testId="AI-ASSIST-send">{t("ast.send")}</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="pn-press fixed bottom-[88px] right-5 z-50 flex items-center gap-2 rounded-full bg-pn-accent px-4 py-3 text-[13px] font-semibold text-pn-accent-ink shadow-lg hover:opacity-90 max-lg:bottom-[76px] max-lg:right-4"
        aria-label={t("ast.title")}
        data-testid="AI-ASSIST-BTN"
      >
        <Icon name={open ? "close" : "sparkle"} size={16} /> {t("ast.title")}
      </button>
    </>
  );
}
