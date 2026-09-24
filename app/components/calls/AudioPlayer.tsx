"use client";

import { useCallback, useRef, useState } from "react";
import { useT } from "../../lib/i18n";
import { fmtClock } from "./primitives";

/* =====================================================================
 * Audio pleer — to'lqin (waveform) bilan.
 *
 * TO'LQIN STRATEGIYASI (foydalanuvchi tanlovi 2026-09-25):
 * panel ochilishi bilan yengil SXEMATIK to'lqin chiziladi (hech narsa
 * yuklanmaydi), ▶ bosilgandan keyingina audio Web Audio API bilan
 * dekodlanib HAQIQIY to'lqinga almashadi. UTel yozuvi daqiqasiga ~1 MB
 * bo'lgani uchun har panel ochilganda to'liq yuklash mobil ilovada
 * qimmatga tushardi.
 *
 * Bitta sahifada faqat BITTA audio o'ynaydi: yangi pleer boshlanganda
 * oldingisi to'xtaydi (jadvaldagi ▶ va paneldagi pleer bitta manba).
 * ===================================================================== */

const BARS = 44;
let currentAudio: HTMLAudioElement | null = null;

/** Haqiqiy to'lqin hali yo'qligida — barqaror, "tirik" ko'rinadigan shakl. */
function placeholderPeaks(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const base = 0.35 + ((h >>> 16) % 100) / 220;
    const envelope = Math.sin((Math.PI * (i + 1)) / (BARS + 1)) * 0.45 + 0.55;
    return Math.min(1, base * envelope);
  });
}

async function decodePeaks(url: string, signal: AbortSignal): Promise<number[] | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const block = Math.floor(data.length / BARS) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < BARS; i++) {
      let peak = 0;
      for (let j = 0; j < block; j++) {
        const v = Math.abs(data[i * block + j] || 0);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
    }
    void ctx.close();
    const max = Math.max(...peaks, 0.01);
    return peaks.map((p) => Math.max(0.06, p / max));
  } catch {
    return null; // to'lqin — qo'shimcha qulaylik, xatosi pleerni buzmasin
  }
}

export function AudioPlayer({ src, callId, compact }: { src: string; callId: string; compact?: boolean }) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(1);
  const [peaks, setPeaks] = useState<number[]>(() => placeholderPeaks(callId));
  const [realPeaks, setRealPeaks] = useState(false);

  /* DIQQAT: callId o'zgarganda holat effektda tozalanmaydi — komponent
   * chaqiruv joyida key={callId} bilan qayta yaratiladi. Shu sabab bu
   * yerda "eski qo'ng'iroqning to'lqini yangisiga o'tib ketish" muammosi
   * yo'q va effekt ichida sinxron setState ham qilinmaydi. */

  /* ▶ bosilganda — haqiqiy to'lqinni bir marta hisoblaymiz. */
  const loadRealPeaks = useCallback(() => {
    if (realPeaks) return;
    const ctrl = new AbortController();
    void decodePeaks(src, ctrl.signal).then((p) => {
      if (p) {
        setPeaks(p);
        setRealPeaks(true);
      }
    });
  }, [src, realPeaks]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      if (currentAudio && currentAudio !== el) currentAudio.pause();
      currentAudio = el;
      void el.play();
      loadRealPeaks();
    } else {
      el.pause();
    }
  }, [loadRealPeaks]);

  const seekTo = (fraction: number) => {
    const el = audioRef.current;
    if (!el || !total) return;
    el.currentTime = Math.max(0, Math.min(total, fraction * total));
    setTime(el.currentTime);
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const progress = total > 0 ? time / total : 0;

  return (
    <div
      className={compact ? "flex items-center gap-3" : "rounded-2xl p-4"}
      style={compact ? undefined : { background: "var(--rec-player-bg)", border: "1px solid var(--rec-border)" }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration || 0)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("rec.pause") : t("rec.listen")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition hover:opacity-90"
          style={{ background: "var(--rec-accent)" }}
        >
          <span aria-hidden className="text-base">{playing ? "❚❚" : "▶"}</span>
        </button>

        {/* To'lqin — bosib kerakli joyga o'tish mumkin */}
        <button
          type="button"
          aria-label="Audio bo'ylab o'tish"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - r.left) / r.width);
          }}
          className="flex h-11 min-w-0 flex-1 items-center gap-[2px]"
        >
          {peaks.map((p, i) => {
            const played = i / peaks.length <= progress;
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.max(8, p * 100)}%`,
                  background: played ? "var(--rec-bar)" : "var(--rec-wave-idle)",
                }}
              />
            );
          })}
        </button>
      </div>

      {!compact && (
        <div className="mt-3 flex items-center justify-between font-mono text-xs" style={{ color: "var(--rec-text-2)" }}>
          <span className="tabular-nums">{fmtClock(time)}</span>
          <button
            type="button"
            onClick={cycleRate}
            className="rounded-lg px-2.5 py-1 font-sans text-xs font-medium transition hover:opacity-80"
            style={{ background: "var(--rec-btn-bg)", border: "1px solid var(--rec-btn-border)", color: "var(--rec-text)" }}
          >
            {rate}x
          </button>
          <span className="tabular-nums">{fmtClock(total)}</span>
        </div>
      )}
    </div>
  );
}
