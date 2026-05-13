import { ROUTE_MODULES } from './routePermissions';
import { ROUTES } from './routes';

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
  module: readonly string[];
}

const menus: MenuItem[] = [
  {
    path: ROUTES.MEMBERS.path,
    label: ROUTES.MEMBERS.label,
    icon: '/assets/subscription.svg',
    module: ROUTE_MODULES.members,
  },
  {
    path: ROUTES.INDUCTION.path,
    label: ROUTES.INDUCTION.label,
    icon: '/assets/induction.svg',
    module: ROUTE_MODULES.induction,
  },
  {
    path: ROUTES.TOUR.path,
    label: ROUTES.TOUR.label,
    icon: '/assets/tour.svg',
    module: ROUTE_MODULES.tour,
  },
  {
    path: ROUTES.SLOT_BOOKINGS.path,
    label: ROUTES.SLOT_BOOKINGS.label,
    icon: '/assets/slot-bookings.svg',
    module: ROUTE_MODULES.bookings,
  },
  {
    path: ROUTES.COACH_SCHEDULE.path,
    label: ROUTES.COACH_SCHEDULE.label,
    icon: '/assets/coach-schedule.svg',
    module: ROUTE_MODULES.coaches,
  },
  {
    path: ROUTES.TAILGATE.path,
    label: ROUTES.TAILGATE.label,
    icon: '/assets/tailgate.svg',
    module: ROUTE_MODULES.tailgate,
  },
  {
    path: ROUTES.MAINTENANCE.path,
    label: ROUTES.MAINTENANCE.label,
    icon: '/assets/maintenance.svg',
    module: ROUTE_MODULES.maintenance,
  },
];

export default menus;
