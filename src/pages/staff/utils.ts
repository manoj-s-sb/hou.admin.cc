import { FORMAT_TO_ACCEPT } from './constants';

import type { AccessLevelConfig } from './types';

/**
 * Whether an access level scopes to specific centres (Facility Only / Admin) and
 * therefore needs an Assigned Centres selection — as opposed to a global level
 * ("All centres"), which covers the whole network. Defaults to false for an
 * unselected level so we never demand centre assignment before a level is picked.
 */
export const isCentreScopedLevel = (level?: AccessLevelConfig | null): boolean => {
  if (!level) return false;
  return !/global|all|network/i.test(`${level.scopeType ?? ''} ${level.scope ?? ''}`);
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

// Shared field styling tokens — used across step components
export const LABEL_CLASS = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500';
export const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none transition focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10';

// Centre names are resolved dynamically from Centre Management via useCentreLookup —
// no hard-coded code→name mapping lives here.
