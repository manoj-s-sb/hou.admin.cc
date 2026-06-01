import { ACCESS_SCOPES } from '../rbac/constants';

import { ROUTES } from './routes';

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
  // Omit to make the item visible to every authenticated portal user (no module gate).
  module?: readonly string[];
}

const menus: MenuItem[] = [
  {
    path: ROUTES.MEMBERS.path,
    label: ROUTES.MEMBERS.label,
    icon: '/assets/subscription.svg',
    module: ACCESS_SCOPES.members,
  },
  {
    path: ROUTES.INDUCTION.path,
    label: ROUTES.INDUCTION.label,
    icon: '/assets/induction.svg',
    module: ACCESS_SCOPES.induction,
  },
  {
    path: ROUTES.TOUR.path,
    label: ROUTES.TOUR.label,
    icon: '/assets/tour.svg',
    module: ACCESS_SCOPES.tour,
  },
  {
    path: ROUTES.SLOT_BOOKINGS.path,
    label: ROUTES.SLOT_BOOKINGS.label,
    icon: '/assets/slot-bookings.svg',
    module: ACCESS_SCOPES.slots,
  },
  {
    path: ROUTES.COACH_SCHEDULE.path,
    label: ROUTES.COACH_SCHEDULE.label,
    icon: '/assets/coach-schedule.svg',
    module: ACCESS_SCOPES.coaches,
  },
  {
    path: ROUTES.TAILGATE.path,
    label: ROUTES.TAILGATE.label,
    icon: '/assets/tailgate.svg',
    module: ACCESS_SCOPES.tailgate,
  },
  {
    path: ROUTES.MAINTENANCE.path,
    label: ROUTES.MAINTENANCE.label,
    icon: '/assets/maintenance.svg',
    module: ACCESS_SCOPES.maintenance,
  },
  {
    path: ROUTES.STAFF_MANAGEMENT.path,
    label: ROUTES.STAFF_MANAGEMENT.label,
    icon: '/assets/user.svg',
    module: ACCESS_SCOPES.staff,
  },
  {
    path: ROUTES.CENTRES.path,
    label: ROUTES.CENTRES.label,
    icon: '/assets/subscription.svg',
    // Super-admin only for now (the Super Admin Portal owns centre management).
    module: ACCESS_SCOPES.superAdmin,
  },
];

export default menus;
