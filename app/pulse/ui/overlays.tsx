"use client";

/* Qalqib chiquvchi primitivlar (spetsifikatsiya §4.6): Popover, Tooltip,
 * Drawer, Modal. Hammasi .pn-root ichidagi #pn-overlays ga portal qilinadi
 * (shriftlar va tokenlar yetib borsin). Esc yopadi, fokus qaytariladi,
 * Drawer/Modal fokusni ushlaydi. */

import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { usePT } from "../i18n";
import { useHydrated } from "../../lib/auth";

export const OVERLAY_ROOT_ID = "pn-overlays";

/* Portal faqat klientda (serverda document yo'q) — gidratatsiyadan keyin. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const mounted = useHydrated();
  if (!mounted) return null;
  const host = document.getElementById(OVERLAY_ROOT_ID) ?? document.body;
  return createPortal(children, host);
}

/* ------------------------------------------------------------ Focus trap */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" && el.offsetParent !== null
  );
}

function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, initial?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = initial?.current ?? focusables(root)[0] ?? root;
    first.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const els = focusables(root);
      if (!els.length) {
        e.preventDefault();
        return;
      }
      const a = els[0];
      const z = els[els.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [ref, active, initial]);
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

/* ------------------------------------------------------------ Positioning */

export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right-start" | "right-end" | "top" | "bottom";

interface Pos {
  top: number;
  left: number;
  placement: Placement;
}

/* Joy yetmasa teskari tomonga o'tadi (auto-flip) va ekrandan chiqmaydi. */
function computePos(anchor: DOMRect, box: { w: number; h: number }, placement: Placement, gap: number): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const M = 8;
  let p = placement;
  const [side, align] = p.split("-") as [string, string | undefined];
  let top = 0;
  let left = 0;
  if (side === "bottom" || side === "top") {
    const below = anchor.bottom + gap;
    const above = anchor.top - gap - box.h;
    let s = side;
    if (s === "bottom" && below + box.h > vh - M && above >= M) s = "top";
    else if (s === "top" && above < M && below + box.h <= vh - M) s = "bottom";
    top = s === "bottom" ? below : above;
    left = align === "end" ? anchor.right - box.w : align === "start" ? anchor.left : anchor.left + anchor.width / 2 - box.w / 2;
    p = (align ? `${s}-${align}` : s) as Placement;
  } else {
    const right = anchor.right + gap;
    left = right + box.w > vw - M ? anchor.left - gap - box.w : right;
    top = align === "end" ? anchor.bottom - box.h : anchor.top;
  }
  left = Math.max(M, Math.min(left, vw - box.w - M));
  top = Math.max(M, Math.min(top, vh - box.h - M));
  return { top, left, placement: p };
}

function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  boxRef: RefObject<HTMLElement | null>,
  placement: Placement,
  gap: number
): Pos | null {
  const [pos, setPos] = useState<Pos | null>(null);
  const update = useCallback(() => {
    const a = anchorRef.current;
    const b = boxRef.current;
    if (!a || !b) return;
    setPos(computePos(a.getBoundingClientRect(), { w: b.offsetWidth, h: b.offsetHeight }, placement, gap));
  }, [anchorRef, boxRef, placement, gap]);
  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (boxRef.current) ro?.observe(boxRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro?.disconnect();
    };
  }, [open, update, boxRef]);
  return open ? pos : null;
}

/* --------------------------------------------------------------- Popover */

/* r20, --panel, --border-3, min-width 240, max-height 70vh (§4.6).
 * Esc va tashqariga bosish yopadi; fokus trigger'ga qaytadi. */
export function Popover({
  open,
  onClose,
  anchorRef,
  placement = "bottom-start",
  gap = 8,
  width,
  minWidth = 240,
  children,
  label,
  role = "dialog",
  className,
  testId,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  placement?: Placement;
  gap?: number;
  width?: number;
  minWidth?: number;
  children: ReactNode;
  label: string;
  role?: "dialog" | "menu" | "listbox";
  className?: string;
  testId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(open, anchorRef, boxRef, placement, gap);
  useEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose, anchorRef]);

  // Fokus: ochilganda ichkariga, yopilganda trigger'ga.
  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const raf = requestAnimationFrame(() => {
      // Ichkaridagi komponent fokusni o'zi qo'ygan bo'lsa (masalan sana
      // tanlagichdagi tanlangan kun), uni o'g'irlamaymiz.
      if (boxRef.current?.contains(document.activeElement)) return;
      const target = initialFocusRef?.current ?? (boxRef.current ? focusables(boxRef.current)[0] : null) ?? boxRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      // Foydalanuvchi boshqa elementni bosgan bo'lsa, fokusni o'g'irlamaymiz.
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost && anchor && document.contains(anchor)) anchor.focus({ preventScroll: true });
    };
  }, [open, anchorRef, initialFocusRef]);

  if (!open) return null;
  const style: CSSProperties = {
    position: "fixed",
    top: pos?.top ?? -9999,
    left: pos?.left ?? -9999,
    width,
    minWidth,
    maxHeight: "70vh",
    visibility: pos ? "visible" : "hidden",
    zIndex: 60,
  };
  return (
    <OverlayPortal>
      <div
        ref={boxRef}
        role={role}
        aria-label={label}
        tabIndex={-1}
        data-testid={testId}
        className={`pn-popover-in overflow-y-auto rounded-[20px] border border-pn-border-3 bg-pn-panel p-3 text-pn-text outline-none ${className ?? ""}`}
        style={style}
      >
        {children}
      </div>
    </OverlayPortal>
  );
}

/* ---------------------------------------------------------------- Tooltip */

/* Hover'da 80 ms dan keyin, fokusda darhol, sensorli ekranda bosilganda
 * ochiladi (§4.6). Trigger o'ralgan <span> — o'z ref'imiz bilan, bola
 * elementning ref/hodisalariga tegmaymiz. */
export function Tooltip({
  content,
  children,
  placement = "top",
  disabled = false,
  className = "inline-flex",
}: {
  content: ReactNode;
  children: ReactNode;
  placement?: Placement;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const pos = useAnchoredPosition(open && !disabled, anchorRef, boxRef, placement, 8);
  useEscape(open, () => setOpen(false));

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const show = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={className}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") show(80);
        }}
        onPointerLeave={hide}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            if (open) hide();
            else show(0);
          }
        }}
        onFocus={() => show(0)}
        onBlur={hide}
      >
        {children}
      </span>
      {open && !disabled && (
        <OverlayPortal>
          <div
            ref={boxRef}
            id={id}
            role="tooltip"
            className="pn-tooltip pointer-events-none max-w-[280px] rounded-[14px] border border-pn-border-3 px-[14px] py-3 text-[13px] leading-snug text-pn-text"
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? "visible" : "hidden",
              zIndex: 70,
            }}
          >
            {content}
          </div>
        </OverlayPortal>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- Drawer */

/* 12 px chetdan ichkarida, r26, --panel, --border-3, orqada --scrim.
 * Kengliklar 400 / 420 / 560; 768 px dan tor ekranda to'liq ekran. */
export function Drawer({
  open,
  onClose,
  side = "right",
  width = 420,
  label,
  children,
  testId,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "left";
  width?: 400 | 420 | 560 | 300;
  label: string;
  children: ReactNode;
  testId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, initialFocusRef);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-50">
        <div className="pn-scrim-in absolute inset-0 bg-pn-scrim" onClick={onClose} aria-hidden />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          className={`${side === "right" ? "pn-drawer-right-in right-3" : "pn-drawer-left-in left-3"} absolute bottom-3 top-3 flex w-(--pn-drawer-w) max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[26px] border border-pn-border-3 bg-pn-panel text-pn-text outline-none max-md:inset-0 max-md:w-full max-md:max-w-none max-md:rounded-none max-md:border-0`}
          style={{ ["--pn-drawer-w" as string]: `${width}px` } as CSSProperties}
        >
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  label,
  width = 560,
  children,
  testId,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  width?: 560 | "analysis";
  children: ReactNode;
  testId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, initialFocusRef);
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <div className="pn-scrim-in absolute inset-0 bg-pn-scrim" onClick={onClose} aria-hidden />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          className="pn-popover-in relative max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[26px] border border-pn-border-3 bg-pn-panel px-6 py-[22px] text-pn-text outline-none"
          style={{ width: width === "analysis" ? "min(960px, calc(100vw - 48px))" : `min(${width}px, calc(100vw - 32px))` }}
        >
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

/* Drawer/Modal sarlavhasi: nom + yopish tugmasi. */
export function OverlayHeader({ title, onClose, children }: { title: ReactNode; onClose: () => void; children?: ReactNode }) {
  const t = usePT();
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="pn-card-title min-w-0 truncate">{title}</h2>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="pn-press grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-pn-border-2 text-pn-muted hover:bg-pn-panel-2 hover:text-pn-text"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
