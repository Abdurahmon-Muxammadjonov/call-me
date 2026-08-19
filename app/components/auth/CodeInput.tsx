"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/* Reusable OTP-style code input — N single-character boxes.
 *   - typing a character auto-advances focus to the next box
 *   - Backspace on an empty box moves focus back and clears the previous one
 *   - Arrow Left/Right move focus without altering the value (keyboard nav)
 *   - pasting a full code distributes it across all boxes at once
 * Controlled: `value` is the plain joined string (e.g. "ABC123XYZ"),
 * `onChange` receives the same shape back. */
export function CodeInput({
  length = 9,
  value,
  onChange,
  autoFocus = false,
  error = false,
  disabled = false,
  label = "Kompaniya kodi",
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function setChar(i: number, char: string) {
    const next = chars.slice();
    next[i] = char;
    onChange(next.join("").replace(/\s+$/, ""));
  }

  function handleChange(i: number, raw: string) {
    // Browsers report the full field value on change, not just the new key —
    // take the last character so overtyping a selected box behaves right.
    const char = raw.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    setChar(i, char);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[i]) {
        setChar(i, "");
      } else if (i > 0) {
        setChar(i - 1, "");
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, length);
    if (!text) return;
    onChange(text);
    const focusIndex = Math.min(text.length, length - 1);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex gap-1.5 sm:gap-2">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          inputMode="text"
          autoComplete="off"
          maxLength={1}
          aria-label={`${label} — ${i + 1}-belgi`}
          className={`h-11 w-8 rounded-lg border text-center font-mono-stat text-base font-medium outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-9 sm:text-lg ${
            error
              ? "border-rose-400 text-rose-600 focus:border-rose-400 focus:ring-rose-400/20"
              : "border-slate-300 text-slate-900 focus:border-brand-blue focus:ring-brand-blue/20 dark:border-white/15 dark:text-white"
          } bg-white dark:bg-white/5`}
        />
      ))}
    </div>
  );
}
