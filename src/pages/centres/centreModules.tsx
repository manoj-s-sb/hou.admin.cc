import React from 'react';

import type { CentreModuleKey } from '../../contexts/CentreNavContext';

export interface CentreModuleDef {
  key: CentreModuleKey;
  label: string;
  icon: React.ReactNode;
}

const I = (paths: React.ReactNode): React.ReactNode => (
  <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    {paths}
  </svg>
);

/** Grouped centre modules — shared by the global Sidebar and the detail view. */
export const CENTRE_MODULE_GROUPS: { group: string; items: CentreModuleDef[] }[] = [
  {
    group: 'Operations',
    items: [
      {
        key: 'members',
        label: 'Members',
        icon: I(
          <>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </>
        ),
      },
      {
        key: 'bookings',
        label: 'Slot Bookings',
        icon: I(
          <>
            <rect height="18" rx="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </>
        ),
      },
      {
        key: 'induction',
        label: 'Induction',
        icon: I(
          <>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </>
        ),
      },
      {
        key: 'tours',
        label: 'Tour List',
        icon: I(
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </>
        ),
      },
      {
        key: 'waitlist',
        label: 'Waitlist / Leads',
        icon: I(
          <>
            <line x1="8" x2="21" y1="6" y2="6" />
            <line x1="8" x2="21" y1="12" y2="12" />
            <line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" />
            <line x1="3" x2="3.01" y1="12" y2="12" />
            <line x1="3" x2="3.01" y1="18" y2="18" />
          </>
        ),
      },
      {
        key: 'tailgate',
        label: 'Tailgate Logs',
        icon: I(
          <>
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </>
        ),
      },
      {
        key: 'maintenance',
        label: 'Maintenance Tasks',
        icon: I(
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        ),
      },
      {
        key: 'tickets',
        label: 'Tickets / Incidents',
        icon: I(
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </>
        ),
      },
    ],
  },
  {
    group: 'Centre Config',
    items: [
      {
        key: 'facility',
        label: 'Facility',
        icon: I(
          <>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </>
        ),
      },
      {
        key: 'lanes',
        label: 'Lanes',
        icon: I(
          <>
            <line x1="4" x2="4" y1="3" y2="21" />
            <line x1="12" x2="12" y1="3" y2="21" />
            <line x1="20" x2="20" y1="3" y2="21" />
          </>
        ),
      },
      {
        key: 'plans',
        label: 'Plans & Pricing',
        icon: I(
          <>
            <rect height="14" rx="2" width="20" x="2" y="7" />
            <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
            <line x1="12" x2="12" y1="12" y2="16" />
            <line x1="10" x2="14" y1="14" y2="14" />
          </>
        ),
      },
      {
        key: 'salesflow',
        label: 'Sales Flow',
        icon: I(
          <>
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-3-3-4 4" />
          </>
        ),
      },
    ],
  },
];
