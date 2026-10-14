"use client";

/* Pulse audio pleer (06-Audio-yozuvlar.png, o'ng panel), 2026-10-14.
 *
 * To'lqin strategiyasi eski pleer bilan bir xil (2026-09-25 qarori):
 * panel ochilishi bilan yengil SXEMATIK to'lqin, ▶ bosilgandan keyingina
 * audio Web Audio API bilan dekodlanib HAQIQIY to'lqinga almashadi (UTel
 * yozuvi daqiqasiga ~1 MB — har ochilishda yuklash qimmat).
 * Sahifada bir vaqtda faqat BITTA audio o'ynaydi (jadvaldagi ▶ ham shu).
 * markers — muhim lahzalar (soniya), to'lqin ustida nuqta bilan. */

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./Icon";

const BARS = 56;
let current: HTMLAudioElement | null = null;

/* Jadvaldagi ▶ va paneldagi pleer bitta "joriy audio"ni bo'lishadi. */
export function claimAudio(el: HTMLAudioElement): void {
  if (current && current !== el) current.pause();
  current = el;
}

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

export function clock(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface AudioPlayerHandle {
  seek: (sec: number) => void;
}

export const AudioPlayer = forwardRef<
  AudioPlayerHandle,
  {
    src: string;
    seed: string;
    durationHint?: number | null;
    markers?: Array<{ time: number; tone: "good" | "bad" | "neutral" }>;
    labels: { play: string; pause: string; back: string; fwd: string; rate: string };
  }
>(function AudioPlayer({ src, seed, durationHint, markers = [], labels }, ref) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(durationHint ?? 0);
  const [rate, setRate] = useState(1);
  const [peaks, setPeaks] = useState<number[]>(() => placeholderPeaks(seed));
  const [real, setReal] = useState(false);

  const loadReal = useCallback(() => {
    if (real) return;
    setReal(true);
    const ctrl = new AbortController();
    void decodePeaks(src, ctrl.signal).then((p) => p && setPeaks(p));
  }, [src, real]);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    claimAudio(el);
    void el.play();
    loadReal();
  }, [loadReal]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) play();
    else el.pause();
  }, [play]);

  const seek = useCallback(
    (sec: number) => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(el.duration || total || sec, sec));
      setTime(el.currentTime);
      if (el.paused) play();
    },
    [play, total]
  );

  useImperativeHandle(ref, () => ({ seek }), [seek]);

  const progress = total > 0 ? time / total : 0;
  const nudge = (d: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || total, el.currentTime + d));
    setTime(el.currentTime);
  };
  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-pn-panel-2 p-4" data-testid="PLAYER">
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
      />
      <div
        className="relative flex h-[64px] cursor-pointer items-center gap-[3px]"
        role="slider"
        aria-label={labels.play}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(time)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") nudge(-5);
          if (e.key === "ArrowRight") nudge(5);
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (total > 0) seek(((e.clientX - r.left) / r.width) * total);
        }}
      >
        {peaks.map((p, i) => {
          const done = i / peaks.length <= progress;
          return (
            <span
              key={i}
              className="min-w-0 flex-1 rounded-full transition-colors"
              style={{ height: `${Math.round(p * 100)}%`, background: done ? "var(--pn-accent)" : "var(--pn-wave-idle)" }}
            />
          );
        })}
        {total > 0 &&
          markers.map((m, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute -top-1 bottom-0 w-[2px] -translate-x-1/2"
              style={{
                left: `${Math.min(100, (m.time / total) * 100)}%`,
                background: m.tone === "good" ? "var(--pn-good)" : m.tone === "bad" ? "var(--pn-bad)" : "var(--pn-muted)",
              }}
            >
              <span
                className="absolute -top-[3px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full"
                style={{ background: m.tone === "good" ? "var(--pn-good)" : m.tone === "bad" ? "var(--pn-bad)" : "var(--pn-muted)" }}
              />
            </span>
          ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? labels.pause : labels.play}
          data-testid="PLAYER-toggle"
          className="pn-press grid h-11 w-11 place-items-center rounded-full bg-pn-accent text-pn-accent-ink"
        >
          <Icon name={playing ? "pause" : "play"} size={16} />
        </button>
        <button type="button" onClick={() => nudge(-10)} aria-label={labels.back} className="pn-mono h-8 rounded-full border border-pn-border-2 px-2 text-[11px] text-pn-text-2 hover:bg-pn-panel-3">−10</button>
        <button type="button" onClick={() => nudge(10)} aria-label={labels.fwd} className="pn-mono h-8 rounded-full border border-pn-border-2 px-2 text-[11px] text-pn-text-2 hover:bg-pn-panel-3">+10</button>
        <span className="pn-mono text-[13px] text-pn-text">
          {clock(time)} <span className="text-pn-subtle">/ {clock(total)}</span>
        </span>
        <button
          type="button"
          onClick={cycleRate}
          aria-label={labels.rate}
          className="pn-mono ml-auto h-8 rounded-full border border-pn-border-2 px-3 text-[12px] font-semibold text-pn-text hover:bg-pn-panel-3"
        >
          {rate}×
        </button>
      </div>
    </div>
  );
});
