/**
 * Shared helpers for the little coloured name-circle avatars. One source of truth
 * so the same person always gets the same initials + colour across the app
 * (previously this exact logic was copy-pasted per page).
 */

/** Brand palette the avatar colour is picked from. */
export const AVATAR_COLORS = ['#21295A', '#008482', '#d97706', '#7c3aed', '#0891b2', '#d42b2b'];

/** Up-to-2-letter initials from a name or email; "—" when there's nothing usable. */
export const initials = (text: string): string =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => Array.from(p)[0]?.toUpperCase() ?? '')
    .join('') || '—';

/** Deterministic palette colour for a seed (name/email) — stable per person. */
export const avatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};
