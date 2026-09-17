/**
 * Pure helpers + constants for the New Centre wizard. Extracted from NewCentreWizard
 * so the component file stays focused on state + rendering. Nothing here touches
 * component state — all functions are pure.
 */
import type { CentreApiStatus } from '../../../store/centres/types';

// Auto-generate short code: first 3 letters of city + 001 (e.g. DAL001).
export const genShortCode = (city: string): string => {
  const letters = city.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!letters) return '';
  return `${letters.substring(0, 3)}001`;
};

export const SHORT_CODE_RE = /^[A-Z0-9]{3,6}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const toNum = (v: number | ''): number => (v === '' ? 0 : Number(v));

// "HH:mm" → minutes since 00:00. Returns NaN on bad input.
export const minutesOf = (hhmm: string): number => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  staging: 'Staging',
  active: 'Active',
  suspended: 'Suspended',
};

export type SaveStatus = 'draft' | 'active' | 'suspended';

// Copy for each selectable "Set Centre Status on Save" radio. The `active`
// title flips to "Reactivate" when the centre is currently suspended.
export const SAVE_STATUS_META: Record<SaveStatus, { title: string; desc: string }> = {
  draft: {
    title: 'Save as Draft',
    desc: 'Centre is saved but invisible to all users including centre staff. Complete setup before going live.',
  },
  active: {
    title: 'Save & Activate',
    desc: 'Centre goes live immediately. Visible to assigned staff and available for member sign-ups. Sends activation notification to assigned Admins.',
  },
  suspended: {
    title: 'Suspend Centre',
    desc: 'Centre is taken offline — hidden from members and closed to new bookings. Existing data is preserved and it can be re-activated anytime.',
  },
};

// Which status radios to offer, given the wizard mode + the centre's current status:
//  • New / draft centre  → Draft, Active (Draft is only ever offered here).
//  • Active / suspended  → Active, Suspend (toggle live ↔ offline).
export const saveStatusOptions = (isEdit: boolean, current?: CentreApiStatus): SaveStatus[] => {
  if (isEdit && (current === 'active' || current === 'suspended')) return ['active', 'suspended'];
  return ['draft', 'active'];
};
