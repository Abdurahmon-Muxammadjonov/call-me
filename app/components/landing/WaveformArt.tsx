/* Decorative waveform bars — the landing page's signature structural
 * element (echoes the "Pulse" in SalesPulse / the Logo's waveform icon).
 * Pure CSS animation (`.waveform-bar`, see globals.css) so it costs nothing
 * at the JS level and already respects prefers-reduced-motion. */

const DEFAULT_HEIGHTS = [30, 55, 40, 70, 45, 90, 55, 35, 65, 50, 80, 40, 60, 30, 75, 45, 55, 35, 85, 50];

function bars(count: number, seed: number[]): number[] {
  if (count <= seed.length) return seed.slice(0, count);
  return Array.from({ length: count }, (_, i) => seed[i % seed.length] ?? 50);
}

export function WaveformArt({
  className = "",
  barCount = 20,
  color = "currentColor",
}: {
  className?: string;
  barCount?: number;
  color?: string;
}) {
  const heights = bars(barCount, DEFAULT_HEIGHTS);
  return (
    <div className={`flex items-center gap-1 ${className}`} style={{ color }} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="waveform-bar w-1 rounded-full bg-current"
          style={{ height: `${h}%`, animationDelay: `${(i % 7) * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/* Large, very faint background composition for hero sections — absolutely
 * positioned, non-interactive, purely atmospheric. */
export function WaveformBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden ${className}`} aria-hidden="true">
      <WaveformArt
        barCount={64}
        className="h-56 w-[140%] max-w-none justify-center gap-1.5 opacity-[0.07] sm:h-72"
        color="#3B5FE3"
      />
    </div>
  );
}
