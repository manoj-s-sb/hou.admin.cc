import { ACCESS_SCOPES } from '../rbac/constants';

import { ROUTES } from './routes';

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
  // Omit to make the item visible to every authenticated portal user (no module gate).
  module?: readonly string[];
  // Hide from the global menu for super admins (they reach it via Centre Management).
  hideForSuperAdmin?: boolean;
}

export interface MenuGroup {
  group: string;
  items: MenuItem[];
}

/**
 * Global sidebar menu, grouped into sections. The Sidebar renders a header per group and
 * filters items by permission (`canRead`) + `hideForSuperAdmin`; a group with no visible
 * items renders nothing.
 */
export const MENU_GROUPS: MenuGroup[] = [
  {
    group: 'Operations',
    items: [
      {
        path: ROUTES.COACH_SCHEDULE.path,
        label: ROUTES.COACH_SCHEDULE.label,
        icon: '/assets/coach-schedule.svg',
        module: ACCESS_SCOPES.coaches,
        hideForSuperAdmin: true,
      },
      {
        path: ROUTES.INDUCTION.path,
        label: ROUTES.INDUCTION.label,
        icon: '/assets/induction.svg',
        module: ACCESS_SCOPES.induction,
        hideForSuperAdmin: true,
      },
      {
        path: ROUTES.MEMBERS.path,
        label: ROUTES.MEMBERS.label,
        icon: '/assets/subscription.svg',
        module: ACCESS_SCOPES.members,
        // Super admins manage members inside Centre Management, so hide the top-level item.
        hideForSuperAdmin: true,
      },
      {
        path: ROUTES.SLOT_BOOKINGS.path,
        label: ROUTES.SLOT_BOOKINGS.label,
        icon: '/assets/slot-bookings.svg',
        module: ACCESS_SCOPES.slots,
        hideForSuperAdmin: true,
      },
      {
        path: ROUTES.TOUR.path,
        label: ROUTES.TOUR.label,
        icon: '/assets/tour.svg',
        module: ACCESS_SCOPES.tour,
        hideForSuperAdmin: true,
      },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      {
        path: ROUTES.MAINTENANCE.path,
        label: ROUTES.MAINTENANCE.label,
        icon: '/assets/maintenance.svg',
        module: ACCESS_SCOPES.maintenance,
        hideForSuperAdmin: true,
      },
      {
        path: ROUTES.TAILGATE.path,
        label: ROUTES.TAILGATE.label,
        icon: '/assets/tailgate.svg',
        module: ACCESS_SCOPES.tailgate,
        hideForSuperAdmin: true,
      },
      {
        // Cross-centre tickets view — a superadmin-owned monitoring page (centre
        // staff use the per-centre Tickets module instead).
        path: ROUTES.TICKETS.path,
        label: ROUTES.TICKETS.label,
        icon: '/assets/maintenance.svg',
        module: ACCESS_SCOPES.superAdmin,
      },
    ],
  },
  {
    group: 'Setup',
    items: [
      {
        path: ROUTES.CENTRES.path,
        label: ROUTES.CENTRES.label,
        icon: '/assets/subscription.svg',
        // Super-admin only for now (the Super Admin Portal owns centre management).
        module: ACCESS_SCOPES.superAdmin,
      },
      {
        path: ROUTES.MEMBERSHIP_PLANS.path,
        label: ROUTES.MEMBERSHIP_PLANS.label,
        icon: '/assets/subscription.svg',
        // Super-admin only — global plan templates are network-wide configuration.
        module: ACCESS_SCOPES.superAdmin,
      },
      {
        path: ROUTES.STAFF_MANAGEMENT.path,
        label: ROUTES.STAFF_MANAGEMENT.label,
        icon: '/assets/user.svg',
        module: ACCESS_SCOPES.staff,
      },
    ],
  },
];

/** Flat list (default export) — kept for consumers that don't care about grouping. */
const menus: MenuItem[] = MENU_GROUPS.flatMap(g => g.items);

export default menus;
