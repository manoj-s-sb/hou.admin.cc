export const getLocalUser = (): { userId: string; name: string; facilityCode: string } => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return { userId: u.userId || '', name, facilityCode: u.facilityCode || '' };
  } catch {
    return { userId: '', name: '', facilityCode: '' };
  }
};

export const FACILITY_CODE = getLocalUser().facilityCode;

export const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200';

export const ALL_LANES = [1, 2, 3, 4, 5, 6, 7];

export const toggleCls = (active: boolean) =>
  `rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
    active ? 'border-transparent bg-[#21295A] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  }`;

export type Tab = 'task' | 'issue' | 'log' | 'schedule';
export type TaskFrequency = 'weekly' | 'bi-weekly' | 'monthly';
export type RaisedBy = 'centre_staff' | 'noc' | 'admin';
export type AssignedTo = 'centre_staff' | 'noc' | 'others';
export type IssuePriority = 'high' | 'medium' | 'low';
export type ActionType = 'tightened' | 'loosened' | 'no_action' | 'other';

export const tabs: { key: Tab; label: string }[] = [
  { key: 'issue', label: 'Issue' },
  { key: 'log', label: 'Log' },
  { key: 'schedule', label: 'Schedule' },
];

export const taskFrequencies: { key: TaskFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'bi-weekly', label: 'Bi-Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export const actionTypes: { key: ActionType; label: string }[] = [
  { key: 'tightened', label: 'Tightened' },
  { key: 'loosened', label: 'Loosened' },
  { key: 'no_action', label: 'No Action' },
  { key: 'other', label: 'Other' },
];
