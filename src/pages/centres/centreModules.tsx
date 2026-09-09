import React, { lazy } from 'react';

import { ACCESS_SCOPES } from '../../rbac/constants';
import CoachSchedule from '../coach';
import Induction from '../induction';
import Members from '../members';
import SlotBookings from '../slots';
import Tailgate from '../tailgate';
import Tickets from '../tickets';
import Tours from '../tours';
import WaitlistLeads from '../waitlist';

import Facilities from './facilities';
import PlansPricing from './plans';

import type { CentreModuleKey } from '../../contexts/CentreNavContext';

// Maintenance is a large page kept in its own chunk (see App.tsx) — lazy-load it here too
// so the registry (imported by the Sidebar) doesn't pull it into the main bundle.
const Maintenance = lazy(() => import('../maintenance'));
// Calendar pulls in react-big-calendar — same chunking rationale as Maintenance above.
const Calendar = lazy(() => import('../calendar'));

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
    // Ordered to match the approved centre-inside sidebar mockup.
    group: 'Operations',
    items: [
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
      {
        key: 'waitlist',
        label: 'Leads',
        slug: 'waitlist',
        component: WaitlistLeads,
        scope: ACCESS_SCOPES.waitlistLeads,
        icon: I(
          <>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect height="4" rx="1" width="8" x="8" y="2" />
            <line x1="9" x2="15" y1="12" y2="12" />
            <line x1="9" x2="13" y1="16" y2="16" />
          </>
        ),
      },
      {
        key: 'tailgate',
        label: 'Tailgate Logs',
        slug: 'tailgate',
        component: Tailgate,
        scope: ACCESS_SCOPES.tailgate,
        icon: I(
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
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
        key: 'tickets',
        label: 'Tickets / Incidents',
        slug: 'tickets',
        component: Tickets,
        scope: ACCESS_SCOPES.tickets,
        icon: I(
          <>
            <path d="M4 5a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2H4z" />
            <path d="M9 5v14" strokeDasharray="2 3" />
          </>
        ),
      },
      {
        // Not shown in the mockup — kept here (appended) so it isn't removed.
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
        // Placed last (below Coach Schedule) per request — a unified calendar view.
        // Assignable per staff member, like every other module here — see
        // ACCESS_SCOPES.calendar / constants/menus.ts's matching entry.
        key: 'calendar',
        label: 'Calendar',
        slug: 'calendar',
        component: Calendar,
        scope: ACCESS_SCOPES.calendar,
        icon: I(
          <>
            <rect height="18" rx="2" width="18" x="3" y="4" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <rect fill="currentColor" height="4" stroke="none" width="4" x="7" y="13" />
          </>
        ),
      },
    ],
  },
  {
    group: 'Centre Config',
    items: [
      {
        key: 'facilities',
        label: 'Facilities',
        slug: 'facilities',
        component: Facilities,
        scope: ACCESS_SCOPES.facilities,
        icon: I(
          <>
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
          </>
        ),
      },
      {
        key: 'plans',
        label: 'Plans & Pricing',
        slug: 'plans-pricing',
        component: PlansPricing,
        scope: ACCESS_SCOPES.plansPricing,
        icon: I(
          <>
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
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
