// ─────────────────────────────────────────────────────────────
// Route paths & labels
// ─────────────────────────────────────────────────────────────
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
} as const;

// Dynamic-path builders for routes with URL params
export const buildRoute = {
  viewMembers: (userId: string) => `/members/${userId}`,
  viewInduction: (userId: string) => `/view-induction/${userId}`,
};

// ─────────────────────────────────────────────────────────────
// Permission module identifiers
// Backend sends these exact keys in the user's permissions object.
// Keep in sync with backend.
// ─────────────────────────────────────────────────────────────
export const SUPER_ADMIN_ONLY = '__superadmin__';

export const MODULES = {
  MEMBERS: 'members',
  BOOKINGS: 'bookings',
  SLOTBOOKING: 'slotbooking',
  COACH_SCHEDULE: 'coachshedule',
  REPORTS: 'reports',
  INDUCTION: 'induction',
  TOUR: 'tour',
  MAINTENANCE: 'maintenance',
  TAILGATE: 'tailgate',
  SUPER_ADMIN: SUPER_ADMIN_ONLY,
} as const;

// ─────────────────────────────────────────────────────────────
// Route → modules mapping
// A page is accessible if the user has the required action on
// ANY of the listed modules. Multi-entry rows accept either the
// granular key (preferred) or the umbrella key (legacy fallback).
// ─────────────────────────────────────────────────────────────
export const ROUTE_MODULES = {
  members: [MODULES.MEMBERS],
  slots: [MODULES.SLOTBOOKING],
  coaches: [MODULES.COACH_SCHEDULE],
  reports: [MODULES.REPORTS],
  induction: [MODULES.INDUCTION],
  tour: [MODULES.TOUR],
  maintenance: [MODULES.MAINTENANCE],
  tailgate: [MODULES.TAILGATE],
  superAdmin: [MODULES.SUPER_ADMIN],
} as const;
