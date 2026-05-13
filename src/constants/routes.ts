export const ROUTES = {
  ROOT: { path: '/', label: '' },
  LOGIN: { path: '/login', label: 'Login' },
  DASHBOARD: { path: '/dashboard', label: 'Dashboard' },
  USERS: { path: '/users', label: 'Users' },
  INDUCTION: { path: '/induction', label: 'Induction' },
  VIEW_INDUCTION: { path: '/view-induction/:userId', label: 'View Induction' },
  TOUR: { path: '/tour', label: 'Tour Details' },
  MEMBERS: { path: '/members', label: 'Members' },
  VIEW_MEMBERS: { path: '/members/:userId', label: 'View Member' },
  SLOT_BOOKINGS: { path: '/slot-bookings', label: 'Slot Bookings' },
  COACH_SCHEDULE: { path: '/coach-schedule', label: 'Coach Schedule' },
  MAINTENANCE: { path: '/maintenance', label: 'Maintenance' },
  TAILGATE: { path: '/tailgate', label: 'Tailgate' },
} as const;

export const buildRoute = {
  viewInduction: (userId: string) => `/view-induction/${userId}`,
  viewMembers: (userId: string) => `/members/${userId}`,
};
