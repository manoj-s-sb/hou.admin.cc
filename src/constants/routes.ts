// Route paths & labels
export const ROUTES = {
  ROOT: { path: '/', label: '' },
  LOGIN: { path: '/login', label: 'Login' },
  REPORTS: { path: '/reports', label: 'Reports' },
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
  STAFF_MANAGEMENT_VIEW: { path: '/staff-management/:staffId', label: 'View Staff Member' },
  STAFF_MANAGEMENT_EDIT: { path: '/staff-management/:staffId/edit', label: 'Edit Staff Member' },
  CENTRES: { path: '/centres', label: 'Centre Management' },
  // One generic centre-scoped route — :moduleSlug resolves to a module in the registry.
  CENTRE_MODULE: { path: '/centres/:facilityCode/:moduleSlug', label: 'Centre Module' },
  MEMBERSHIP_PLANS: { path: '/membership-plans', label: 'Membership Plans' },
  TICKETS: { path: '/tickets', label: 'Tickets / Incidents' },
} as const;

// Dynamic-path builders for routes with URL params
export const buildRoute = {
  viewMembers: (userId: string) => `/members/${userId}`,
  viewInduction: (userId: string) => `/view-induction/${userId}`,
  viewStaffMember: (staffId: string) => `/staff-management/${staffId}`,
  editStaffMember: (staffId: string) => `/staff-management/${staffId}/edit`,
  centreModule: (facilityCode: string, moduleSlug: string) => `/centres/${facilityCode}/${moduleSlug}`,
};
