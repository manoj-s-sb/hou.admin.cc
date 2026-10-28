import { getLocalUser } from '../../constants/user';
import { scopeType } from '../../rbac';
import store, { type RootState } from '../../store/store';

import { FORMAT_TO_ACCEPT } from './constants';

import type { AccessLevelConfig } from './types';
import type { StaffListRequest } from '../../store/staff/types';

/**
 * Whether an access level scopes to a COUNTRY/REGION (e.g. Country Manager) — it
 * needs a country picked, not a centre list. Defaults to false when unselected.
 */
export const isCountryScopedLevel = (level?: AccessLevelConfig | null): boolean => {
  if (!level) return false;
  return /country|region/i.test(`${level.scopeType ?? ''} ${level.scope ?? ''}`);
};

/**
 * Whether an access level scopes to specific centres (Facility Only / Admin) and
 * therefore needs an Assigned Centres selection — as opposed to a global level
 * ("All centres"), which covers the whole network, or a country/region level
 * (which needs a country). Defaults to false for an unselected level so we never
 * demand centre assignment before a level is picked.
 */
export const isCentreScopedLevel = (level?: AccessLevelConfig | null): boolean => {
  if (!level) return false;
  const s = `${level.scopeType ?? ''} ${level.scope ?? ''}`;
  if (/global|all|network/i.test(s)) return false;
  if (/country|region/i.test(s)) return false;
  return true;
};

export const buildAcceptString = (formats: string[] = []): string =>
  formats.map(f => FORMAT_TO_ACCEPT[f.toUpperCase()] ?? `.${f.toLowerCase()}`).join(',');

export const sortActiveUnique = <T extends { id: string; isActive: boolean; order: number }>(items: T[] = []): T[] => {
  const seen = new Set<string>();
  return items
    .filter(i => {
      if (!i.isActive) return false;
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const validatePassword = (pw: string): string | null => {
  if (!pw) return 'Default password is required';
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one special character';
  return null;
};

export const MIN_STAFF_AGE_YEARS = 16;

// Latest Date of Birth that satisfies the minimum staff age, as yyyy-mm-dd —
// e.g. today 2026-10-26 with a 16-year minimum -> "2010-10-26". Always
// strictly before today, so this single cutoff covers "DOB is today",
// "DOB is in the future", AND "staff member is too young" all at once.
export const maxDobForMinAge = (minAgeYears: number = MIN_STAFF_AGE_YEARS): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAgeYears);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isBelowMinimumAge = (dateStr: string, minAgeYears: number = MIN_STAFF_AGE_YEARS): boolean =>
  Boolean(dateStr) && dateStr > maxDobForMinAge(minAgeYears);

export const blankToNull = (v: string | null | undefined): string | null => {
  const trimmed = (v ?? '').toString().trim();
  return trimmed === '' ? null : trimmed;
};

// Returns the id of a config qualification that already represents "Other"
// (so we don't render a duplicate synthetic option). Null if none exists.
export const getConfigOtherQualificationId = (quals: { id: string; label: string }[] = []): string | null => {
  const match = quals.find(q => q.id.toLowerCase() === 'other' || q.label.trim().toLowerCase().startsWith('other'));
  return match ? match.id : null;
};

// Designation/role labels — shared by Staff Management's own list and anywhere
// else that needs to show a staff member's role (e.g. the ticket assignee picker).
const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  coach: 'Coach',
  staff: 'Staff',
  manager: 'Manager',
};

export const formatRoleLabel = (role: string): string =>
  ROLE_LABEL[role.toLowerCase()] ?? role.charAt(0).toUpperCase() + role.slice(1);

// Turns a raw internal config code (e.g. "bachelorphysed", "facility_only")
// into a readable fallback label ("Bachelor Physed", "Facility Only") when
// there's no matching config entry to pull a real label from.
export const humanizeCode = (code: string): string =>
  code
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();

// SM-10: resolve a raw config code (qualification, certification, access
// level, ...) to its configured human-readable label, falling back to a
// humanized version of the code itself rather than ever showing the raw
// code verbatim (e.g. "iccl2coach", "facilityonly").
// Mirrors the backend's CreateRoleRequest/CreateAccessLevelRequest validation
// (staff_config_models.py's _validate_display_name) — a custom role/access-
// level name must look like an actual name: starts with a letter/digit, then
// only letters, digits, spaces, hyphens, apostrophes, or '&', at least 2
// characters. Rejects junk like "mn,m." or ",," at the point of entry rather
// than only after a round-trip to the backend.
const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &'-]*$/;
export const isValidDisplayName = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && DISPLAY_NAME_PATTERN.test(trimmed);
};

// Mirrors the backend's _validate_description — a description is free text
// (punctuation is fine, unlike the name), the only real problem reported was
// a literal "hjkl"-style junk entry, so this just enforces a minimum length.
// Blank is always valid (description is optional).
export const MIN_DESCRIPTION_LENGTH = 10;
export const isValidDescription = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.length >= MIN_DESCRIPTION_LENGTH;
};

export const resolveConfigLabel = (
  options: { id: string; label: string }[] | undefined,
  code: string | null | undefined
): string => {
  if (!code) return '—';
  const match = (options ?? []).find(o => o.id.toLowerCase() === code.toLowerCase());
  return match?.label || humanizeCode(code);
};

// Shared field styling tokens — used across step components
export const LABEL_CLASS = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500';
export const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10';

// Phone number stores the dial code as a plain prefix on one string (e.g.
// "+91 98765 43210") — same convention the New Centre wizard already uses for
// its own phone field, rather than a separate country-code field on the model.
/** Dial code prefix already on a phone string (e.g. "+1" from "+1 555 000 0000"). */
export const dialCodeOf = (phone: string): string => /^\+\d{1,3}/.exec(phone.trim())?.[0] ?? '';
export const stripDialCode = (phone: string): string => phone.trim().replace(/^\+\d{1,3}\s*/, '');

// Centre names are resolved dynamically from Centre Management via useCentreLookup —
// no hard-coded code→name mapping lives here.

/**
 * Scope-aware params for GET /admin/staff/list, shared by the list page and every
 * post-create/update refetch. A network-wide (global/superadmin) viewer must see
 * EVERY staff member — including country-scoped ones with facilityCode: null — so no
 * filter is sent; scoping the request to the viewer's OWN facility/country (the old
 * behaviour) silently hid any staff member outside that one facility, including a
 * country manager the viewer had just created. Country/regional-scoped viewers filter
 * to their country; everyone else (facility-scoped) filters to their own facility.
 */
export const buildStaffListParams = (
  limit = 50,
  offset = 0,
  extra: { search?: string; role?: string; accessLevel?: string } = {}
): StaffListRequest => {
  const authState = (store.getState() as RootState).auth;
  const countryCode = authState.scope?.countryCodes?.[0] || authState.user?.countryCode || undefined;
  const facilityCode = getLocalUser().facilityCode || '';
  const level = scopeType();
  if (level === 'global') return { limit, offset, ...extra };
  if (level === 'country' || level === 'regional') return { countryCode, limit, offset, ...extra };
  return { facilityCode, limit, offset, ...extra };
};
