/**
 * Small value-formatting helpers shared across the Centres / Membership pages.
 *
 * NOTE: only genuinely-identical helpers live here. Deliberately NOT centralized,
 * because they diverged in behaviour and merging them would change output:
 *   - `money`: three different jobs (USD-only `$`, currency conversion, Intl per-currency).
 *   - the `parseFloat`-based `num` in bundleToWizardState (keeps leading digits of "12px").
 *   - `STATUS_PILL`/`STATUS_META` (raw Tailwind classes) vs `CENTRE_STATUS` (`cmx-pill` tokens).
 */

/** Coerce an unknown value to a finite number, defaulting to 0. */
export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** True when a value is present (not null/undefined) — lets a UI show "—" instead of a real 0. */
export const has = (v: unknown): boolean => v !== undefined && v !== null;
