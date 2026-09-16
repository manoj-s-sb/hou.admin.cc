/**
 * Maintenance & Tasks — UI constants. Enum lists mirror the backend
 * (work_items/domain/constants.py); display meta (labels, colours, badges) is
 * frontend-only. Keep the enum arrays in sync with the backend.
 */
import { getFacilityCode, getLocalUser } from '../../constants/user';
import { getRole, isSuperAdmin } from '../../rbac/permissions';

import type { FreqUnit, TaskType, TemplatePriority, TaskTemplate, TemplateEnrich } from '../../store/maintenance/types';

export { getFacilityCode, getLocalUser };

export const ALL_LANES = [1, 2, 3, 4, 5, 6, 7];

// Template CRUD + scheduling are admin-only server-side (ADMIN_ROLES: superadmin,
// super_admin, admin) — a role-identity gate, distinct from the module read/write
// permission system. Route the superadmin half through the canonical isSuperAdmin()
// (checks userType[] as well as role, unlike a raw string match) so a superadmin whose
// `role` field doesn't literally say "superadmin" isn't incorrectly denied here.
const MAINTENANCE_EXTRA_ADMIN_ROLES = ['super_admin', 'admin'];
export const canManageTasks = (): boolean =>
  isSuperAdmin() || MAINTENANCE_EXTRA_ADMIN_ROLES.includes(getRole().toLowerCase());

export const EQUIPMENT_CUSTOM_SENTINEL = 'Other (custom)';
export const EQUIPMENT_OPTIONS: string[] = [
  'SD BM',
  'Display',
  'Gym Equipment',
  'HVAC',
  'Network',
  'General',
  EQUIPMENT_CUSTOM_SENTINEL,
];

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

export const TASK_TYPES: { value: TaskType; label: string; icon: string; badge: string }[] = [
  { value: 'mech', label: 'Mechanical', icon: '⚙', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { value: 'elec', label: 'Electrical', icon: '⚡', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { value: 'other', label: 'Other', icon: '📋', badge: 'bg-gray-100 text-gray-600 border border-gray-200' },
];

export const taskTypeMeta = (t: TaskType) => TASK_TYPES.find(x => x.value === t) ?? TASK_TYPES[2];

export const FREQ_UNITS: { value: FreqUnit; label: string }[] = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

export const PRIORITIES: { value: TemplatePriority; label: string; dot: string; text: string; pill: string }[] = [
  {
    value: 'high',
    label: 'High',
    dot: 'bg-red-500',
    text: 'text-red-600',
    pill: 'bg-red-50 text-red-700 border border-red-200',
  },
  {
    value: 'medium',
    label: 'Medium',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  {
    value: 'low',
    label: 'Low',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
];

export const priorityMeta = (p: TemplatePriority) => PRIORITIES.find(x => x.value === p) ?? PRIORITIES[1];

/** Human-readable frequency label, e.g. "Weekly", "Bi-Weekly", "Quarterly". */
export const freqLabel = (freqN: number, freqUnit: FreqUnit): string => {
  if (freqUnit === 'day') return freqN === 1 ? 'Daily' : `Every ${freqN} Days`;
  if (freqUnit === 'week') {
    if (freqN === 1) return 'Weekly';
    if (freqN === 2) return 'Bi-Weekly';
    return `Every ${freqN} Weeks`;
  }
  if (freqUnit === 'month') {
    if (freqN === 1) return 'Monthly';
    if (freqN === 3) return 'Quarterly';
    if (freqN === 6) return 'Half-Yearly';
    return `Every ${freqN} Months`;
  }
  return freqN === 1 ? 'Yearly' : `Every ${freqN} Years`;
};

/**
 * The next occurrence date after `fromISO`, advancing by the task frequency
 * (e.g. a Weekly task on 2026-07-17 → 2026-07-24). Returns an ISO yyyy-mm-dd
 * string. Month/year steps clamp naturally via the Date API.
 */
export const nextOccurrence = (fromISO: string, freqN: number, freqUnit: FreqUnit): string => {
  const d = new Date(`${fromISO}T00:00:00`);
  const n = Math.max(1, freqN || 1);
  if (freqUnit === 'day') d.setDate(d.getDate() + n);
  else if (freqUnit === 'week') d.setDate(d.getDate() + n * 7);
  else if (freqUnit === 'month') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Coloured pill class for a frequency badge on cards. */
export const freqBadgeCls = (freqN: number, freqUnit: FreqUnit): string => {
  if (freqUnit === 'day') return 'bg-sky-50 text-sky-700 border border-sky-200';
  if (freqUnit === 'week') {
    return freqN === 2
      ? 'bg-violet-50 text-violet-700 border border-violet-200'
      : 'bg-teal-50 text-teal-700 border border-teal-200';
  }
  return 'bg-orange-50 text-orange-700 border border-orange-200';
};

/* ── Frequency buckets (tab filters) ── */

export type GlobalBucket = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type CentreBucket = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export const GLOBAL_BUCKETS: { key: GlobalBucket; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly+' },
];

export const CENTRE_BUCKETS: { key: CentreBucket; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
];

type FreqSource = Pick<TaskTemplate, 'freqN' | 'freqUnit'> | Pick<TemplateEnrich, 'freqN' | 'freqUnit'>;

export const globalBucket = (t: FreqSource): GlobalBucket => {
  if (t.freqUnit === 'day') return 'daily';
  if (t.freqUnit === 'week') return 'weekly';
  if (t.freqUnit === 'month' && t.freqN < 3) return 'monthly';
  return 'quarterly'; // month>=3 or year
};

export const centreBucket = (t: FreqSource): CentreBucket => {
  if (t.freqUnit === 'day') return 'daily';
  if (t.freqUnit === 'week') return t.freqN === 2 ? 'biweekly' : 'weekly';
  if (t.freqUnit === 'year') return 'quarterly';
  return t.freqN >= 3 ? 'quarterly' : 'monthly'; // month
};

/* ── Shared Tailwind class fragments ── */

export const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';

export const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

export const scheduleStatusMeta: Record<string, { label: string; pill: string }> = {
  pending: { label: 'Pending', pill: 'bg-gray-100 text-gray-600' },
  done: { label: 'Done', pill: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Overdue', pill: 'bg-red-100 text-red-700' },
};
