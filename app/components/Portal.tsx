"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* Renders children directly into document.body instead of in place.
 *
 * Why this exists: the dashboard content area animates in with
 * `animate-slide-up` (a transform-based CSS animation). Any element with a
 * non-none `transform` creates a new CSS stacking context — which traps
 * every z-index inside it, no matter how high, so it can never paint above
 * a sibling like the sticky header (which has its own stacking context via
 * `position: sticky` + `z-index`). That's why modals opened from inside a
 * view were rendering *behind* the header. Portal sidesteps the whole
 * problem by mounting straight onto <body>, outside any ancestor's
 * stacking context.
 *
 * `document` doesn't exist during SSR, so this can only render once
 * hydrated on the client. useSyncExternalStore (rather than a
 * useState+useEffect "mounted" flag) is what lets that happen without a
 * hydration mismatch: React deliberately renders the `getServerSnapshot`
 * value through hydration and only switches to `getSnapshot` afterward —
 * same trick as theme.ts/i18n.ts elsewhere in this app. There's nothing to
 * actually subscribe to (mount status never changes after hydration), so
 * `subscribe` is a no-op. */
function subscribe(): () => void {
  return () => {};
}
function getSnapshot(): boolean {
  return true;
}
function getServerSnapshot(): boolean {
  return false;
}

export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
