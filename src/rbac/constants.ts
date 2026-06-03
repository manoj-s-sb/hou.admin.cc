// Permission module identifiers
// Values are the exact keys the backend sends in the user's permissions
// payload. Keep these in sync with backend module names.

// Role strings the backend may use to denote a super admin. Compared
// case-insensitively. Add any new backend variants here.
export const SUPER_ADMIN_ROLES = ['stancebeamadmin', 'superadmin'] as const;
// Kept for backwards compatibility; primary role string.
export const SUPER_ADMIN_ROLE = SUPER_ADMIN_ROLES[0];
export const SUPER_ADMIN_ONLY = '__superadmin__';

export const MODULES = {
  MEMBERS: 'members',
  SLOT_BOOKING: 'slotbooking',
  // Backend uses 'coachshedule' (typo intentional — do not "correct" without backend change)
  COACH_SCHEDULE: 'coachshedule',
  REPORTS: 'reports',
  INDUCTION: 'induction',
  TOUR: 'tour',
  MAINTENANCE: 'maintenance',
  TAILGATE: 'tailgate',
  STAFF: 'staffmanagement',
  SUPER_ADMIN: SUPER_ADMIN_ONLY,
} as const;

// Access scopes per route. A route is accessible if the user has the
// required action on ANY of the modules listed here.
export const ACCESS_SCOPES = {
  members: [MODULES.MEMBERS],
  slots: [MODULES.SLOT_BOOKING],
  coaches: [MODULES.COACH_SCHEDULE],
  reports: [MODULES.REPORTS],
  induction: [MODULES.INDUCTION],
  tour: [MODULES.TOUR],
  maintenance: [MODULES.MAINTENANCE],
  tailgate: [MODULES.TAILGATE],
  staff: [MODULES.STAFF],
  superAdmin: [MODULES.SUPER_ADMIN],
} as const;
