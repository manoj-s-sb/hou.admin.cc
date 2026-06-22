import React, { lazy } from 'react';

import { ACCESS_SCOPES } from '../../rbac/constants';
import CoachSchedule from '../coach';
import Induction from '../induction';
import Members from '../members';
import SlotBookings from '../slots';
import Tours from '../tours';

import type { CentreModuleKey } from '../../contexts/CentreNavContext';

// Maintenance is a large page kept in its own chunk (see App.tsx) — lazy-load it here too
// so the registry (imported by the Sidebar) doesn't pull it into the main bundle.
const Maintenance = lazy(() => import('../maintenance'));

export interface CentreModuleDef {
  key: CentreModuleKey;
  label: string;
  /** URL segment — the centre route is /centres/:facilityCode/<slug>. */
  slug: string;
  icon: React.ReactNode;
  /** Page rendered inside the centre shell. Required for a LIVE module. */
  component?: React.ComponentType;
  /** Permission scope checked before rendering. Required for a LIVE module. */
  scope?: readonly string[];
}

const I = (paths: React.ReactNode): React.ReactNode => (
  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    {paths}
  </svg>
);

/**
 * Grouped centre modules — the single source of truth for the centre's left nav
 * (rendered by the global Sidebar) AND the generic centre route (CentreModuleRoute looks a
 * module up by slug, gates on `scope`, renders `component`).
 *
 * Adding a module = (1) scope its page to getFacilityCode(), (2) add an entry here with
 * slug + component + scope. No new route file, no App.tsx edit, no Sidebar edit.
 */
export const CENTRE_MODULE_GROUPS: { group: string; items: CentreModuleDef[] }[] = [
  {
    group: 'Operations',
    items: [
      {
        key: 'coach',
        label: 'Coach Schedule',
        slug: 'coach-schedule',
        component: CoachSchedule,
        scope: ACCESS_SCOPES.coaches,
        icon: I(
          <>
            <rect height="18" rx="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <path d="M8 14l2 2 4-4" />
          </>
        ),
      },
      {
        key: 'induction',
        label: 'Induction',
        slug: 'induction',
        component: Induction,
        scope: ACCESS_SCOPES.induction,
        icon: I(
          <>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </>
        ),
      },
      {
        key: 'maintenance',
        label: 'Maintenance Tasks',
        slug: 'maintenance',
        component: Maintenance,
        scope: ACCESS_SCOPES.maintenance,
        icon: I(
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        ),
      },
      {
        key: 'members',
        label: 'Members',
        slug: 'members',
        component: Members,
        scope: ACCESS_SCOPES.members,
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
        slug: 'slot-bookings',
        component: SlotBookings,
        scope: ACCESS_SCOPES.slots,
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
        key: 'tours',
        label: 'Tour List',
        slug: 'tours',
        component: Tours,
        scope: ACCESS_SCOPES.tour,
        icon: I(
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </>
        ),
      },
    ],
  },
];

/**
 * Not-yet-live module definitions, parked here so enabling one later is a move into
 * CENTRE_MODULE_GROUPS (then add its component + scope) — no icon re-drawing. Each already
 * carries its url slug. Not rendered anywhere today.
 */

/** Flat list of live modules — the generic centre route resolves a slug against this. */
export const LIVE_CENTRE_MODULES: CentreModuleDef[] = CENTRE_MODULE_GROUPS.flatMap(g => g.items);
