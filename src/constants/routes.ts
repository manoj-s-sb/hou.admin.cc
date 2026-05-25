// Route paths & labels
export const ROUTES = {
  ROOT: { path: '/', label: '' },
  LOGIN: { path: '/login', label: 'Login' },
  DASHBOARD: { path: '/dashboard', label: 'Dashboard' },
  USERS: { path: '/users', label: 'Users' },
  MEMBERS: { path: '/members', label: 'Members' },
  VIEW_MEMBERS: { path: '/members/:userId', label: 'View Member' },
  INDUCTION: { path: '/induction', label: 'Induction' },
  VIEW_INDUCTION: { path: '/view-induction/:userId', label: 'View Induction' },
  TOUR: { path: '/tour', label: 'Tour Details' },
  SLOT_BOOKINGS: { path: '/slot-bookings', label: 'Slot Bookings' },
  COACH_SCHEDULE: { path: '/coach-schedule', label: 'Coach Schedule' },
  MAINTENANCE: { path: '/maintenance', label: 'Maintenance' },
  TAILGATE: { path: '/tailgate', label: 'Tailgate' },
  STAFF_MANAGEMENT: { path: '/staff-management', label: 'Staff Management' },
  STAFF_MANAGEMENT_ADD: { path: '/staff-management/add', label: 'Add Staff Member' },
} as const;

// Dynamic-path builders for routes with URL params
export const buildRoute = {
  viewMembers: (userId: string) => `/members/${userId}`,
  viewInduction: (userId: string) => `/view-induction/${userId}`,
};
