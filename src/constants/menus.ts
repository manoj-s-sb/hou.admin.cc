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
    // Facility-role operations pages. All hidden for super admins (who manage these
    // inside Centre Management), so a superadmin's first visible group is Setup —
    // matching the approved global mockup. Coach Schedule and Induction are
    // intentionally centre-only (see centreModules) and are NOT listed here.
    group: 'Operations',
    items: [
      {
        path: ROUTES.MEMBERS.path,
        label: ROUTES.MEMBERS.label,
        icon: '/assets/subscription.svg',
        module: ACCESS_SCOPES.members,
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
    group: 'Setup',
    items: [
      {
        path: ROUTES.MEMBERSHIP_PLANS.path,
        label: ROUTES.MEMBERSHIP_PLANS.label,
        icon: '/assets/subscription.svg',
        // Super-admin only — global plan templates are network-wide configuration.
        module: ACCESS_SCOPES.superAdmin,
      },
      {
        path: ROUTES.CENTRES.path,
        label: ROUTES.CENTRES.label,
        icon: '/assets/subscription.svg',
        // Visible to anyone with centremanagement:read. Mutations (create/edit/
        // suspend/delete) are further gated to super admins inside the page (§4).
        module: ACCESS_SCOPES.centreManagement,
      },
      {
        path: ROUTES.STAFF_MANAGEMENT.path,
        label: ROUTES.STAFF_MANAGEMENT.label,
        icon: '/assets/user.svg',
        module: ACCESS_SCOPES.staff,
      },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      {
        // Network-wide analytics page (gated by the reports scope).
        path: ROUTES.REPORTS.path,
        label: 'Reports',
        icon: '/assets/reports.svg',
        module: ACCESS_SCOPES.reports,
      },
      {
        // Cross-centre tickets view — a superadmin-owned monitoring page (centre
        // staff use the per-centre Tickets module instead).
        path: ROUTES.TICKETS.path,
        label: ROUTES.TICKETS.label,
        icon: '/assets/maintenance.svg',
        module: ACCESS_SCOPES.superAdmin,
      },
      {
        // Tailgate access logs — visible to super admins and any role with the scope.
        path: ROUTES.TAILGATE.path,
        label: 'Tailgate Logs',
        icon: '/assets/tailgate.svg',
        module: ACCESS_SCOPES.tailgate,
      },
    ],
  },
  {
    group: 'Maintenance',
    items: [
      {
        // Global task library — define tasks once; scheduling/execution happens per centre.
        path: ROUTES.MAINTENANCE.path,
        label: 'Maintenance & Tasks',
        icon: '/assets/maintenance.svg',
        module: ACCESS_SCOPES.maintenance,
      },
    ],
  },
];

/** Flat list (default export) — kept for consumers that don't care about grouping. */
const menus: MenuItem[] = MENU_GROUPS.flatMap(g => g.items);

export default menus;
