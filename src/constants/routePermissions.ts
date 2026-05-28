import { SUPER_ADMIN_ONLY } from '../utils/permissions';

export const ROUTE_MODULES = {
  members: ['members'],
  bookings: ['bookings', 'slotbooking'],
  slots: ['slots'],
  coaches: ['coaches', 'coachshedule'],
  reports: ['reports'],
  workitems: ['workitems'],
  induction: ['workitems', 'induction'],
  tour: ['workitems', 'tour'],
  maintenance: ['workitems'],
  tailgate: ['workitems'],
  superAdmin: [SUPER_ADMIN_ONLY],
} as const;
