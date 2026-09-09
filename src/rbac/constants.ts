// Permission module identifiers
// Values are the exact keys the backend sends in the user's permissions
// payload. Keep these in sync with backend module names.

// Role strings the backend may use to denote a super admin. Compared
// case-insensitively. Add any new backend variants here.
export const SUPER_ADMIN_ROLES = ['stancebeamadmin', 'superadmin'] as const;
// Kept for backwards compatibility; primary role string.
export const [SUPER_ADMIN_ROLE] = SUPER_ADMIN_ROLES;
export const SUPER_ADMIN_ONLY = '__superadmin__';

// The backend module ids (RBAC spec §1). Values MUST match the keys the
// backend sends in permissions.modules.
// Maintenance / Tailgate / Tickets now arrive from some environments (e.g. UAT)
// split into "_centre" and "_allcentres" scoped variants instead of the plain
// id — both forms are kept here as aliases of the same page (see ACCESS_SCOPES
// below) until every backend environment is on the same schema.
export const MODULES = {
  MEMBERS: 'members',
  SLOT_BOOKING: 'slotbooking',
  COACH_SCHEDULE: 'coachschedule',
  REPORTS: 'reports',
  INDUCTION: 'induction',
  TOUR: 'tour',
  MAINTENANCE: 'maintenance',
  MAINTENANCE_CENTRE: 'maintenance_centre',
  MAINTENANCE_ALLCENTRES: 'maintenance_allcentres',
  TAILGATE: 'tailgate',
  TAILGATE_CENTRE: 'tailgate_centre',
  TAILGATE_ALLCENTRES: 'tailgate_allcentres',
  CENTRE_MANAGEMENT: 'centremanagement',
  STAFF: 'staffmanagement',
  TICKETS: 'ticketsincidents',
  TICKETS_CENTRE: 'ticketsincidents_centre',
  TICKETS_ALLCENTRES: 'ticketsincidents_allcentres',
  MEMBERSHIP_PLANS: 'membershipplans',
  WAITLIST_LEADS: 'waitlistleads',
  FACILITIES: 'facilities',
  PLANS_PRICING: 'planspricing',
  CALENDAR: 'calendar',
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
  maintenance: [MODULES.MAINTENANCE, MODULES.MAINTENANCE_CENTRE, MODULES.MAINTENANCE_ALLCENTRES],
  tailgate: [MODULES.TAILGATE, MODULES.TAILGATE_CENTRE, MODULES.TAILGATE_ALLCENTRES],
  centreManagement: [MODULES.CENTRE_MANAGEMENT],
  staff: [MODULES.STAFF],
  tickets: [MODULES.TICKETS, MODULES.TICKETS_CENTRE, MODULES.TICKETS_ALLCENTRES],
  membershipPlans: [MODULES.MEMBERSHIP_PLANS],
  waitlistLeads: [MODULES.WAITLIST_LEADS],
  facilities: [MODULES.FACILITIES],
  plansPricing: [MODULES.PLANS_PRICING],
  calendar: [MODULES.CALENDAR],
  superAdmin: [MODULES.SUPER_ADMIN],
} as const;
