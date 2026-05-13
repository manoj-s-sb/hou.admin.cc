import { ROUTE_MODULES } from './routePermissions';

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
  module: readonly string[];
}

const menus: MenuItem[] = [
  {
    path: '/members',
    label: 'Members',
    icon: '/assets/subscription.svg',
    module: ROUTE_MODULES.members,
  },
  {
    path: '/induction',
    label: 'Induction',
    icon: '/assets/induction.svg',
    module: ROUTE_MODULES.induction,
  },
  {
    path: '/tour',
    label: 'Tour Details',
    icon: '/assets/tour.svg',
    module: ROUTE_MODULES.tour,
  },
  {
    path: '/slot-bookings',
    label: 'Slot Bookings',
    icon: '/assets/slot-bookings.svg',
    module: ROUTE_MODULES.bookings,
  },
  {
    path: '/coach-schedule',
    label: 'Coach Schedule',
    icon: '/assets/coach-schedule.svg',
    module: ROUTE_MODULES.coaches,
  },
  {
    path: '/tailgate',
    label: 'Tailgate',
    icon: '/assets/tailgate.svg',
    module: ROUTE_MODULES.tailgate,
  },
  {
    path: '/maintenance',
    label: 'Maintenance',
    icon: '/assets/maintenance.svg',
    module: ROUTE_MODULES.maintenance,
  },
];

export default menus;
