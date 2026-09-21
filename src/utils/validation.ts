/**
 * Shared form-field validation. One source of truth so every screen agrees on
 * what "valid" means (previously the email rule was copy-pasted 5+ times, and had
 * drifted between a 1-char and 2-char TLD variant).
 */

/** Email format check. Requires a real 2+ character top-level domain. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Convenience wrapper — trims before testing. */
export const isValidEmail = (email: string): boolean => EMAIL_RE.test(email.trim());
