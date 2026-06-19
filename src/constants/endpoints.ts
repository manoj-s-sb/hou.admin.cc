const endpoints = {
  slots: {
    list: '/admin/slots/calendar',
    updateLaneStatus: '/admin/slots/status/update',
    coachSlots: '/admin/coach/calendar',
    updateCoachSlots: 'admin/coach/status/update',
  },
  login: '/admin/auth/login',
  members: {
    list: '/admin/members/list',
    membersDetails: '/admin/member/details',
    membersCount: '/admin/members/stats',
  },
  tour: {
    updateTourStatus: '/admin/bookings/tour/status/update',
  },
  maintenance: {
    workList: '/admin/work/list',
    createWork: '/admin/work/create',
    updateWork: '/admin/work/update',
    workDetail: '/admin/work/detail',
    uploadUrl: '/admin/work/uploadurl',
    deleteMedia: '/admin/work/deletemedia',
  },
  tailgate: {
    createEvent: '/admin/tailgate/events',
    review: '/admin/tailgate/review',
    stats: '/admin/tailgate/stats',
  },
  staff: {
    config: '/admin/staff/config',
    list: '/admin/staff/list',
    create: '/admin/staff/create',
    details: '/admin/staff/details',
    update: '/admin/staff/update',
  },
  induction: {
    list: '/admin/bookings/list',
    search: '/admin/induction/search',
    update: '/admin/induction/status/update',
    updateBookingStatus: '/admin/induction/bookingstatus/update',
    activateSubscription: 'subscription/admin/activate',
    userInductionDetails: '/admin/induction/details',
  },
  centres: {
    // New doc-bundle model (live backend) — all POST.
    centresList: '/admin/centres/list', // POST { status?, search?, skip, limit, sort, order }
    centreDetails: '/admin/centres/details', // POST { code }
    centreCreate: '/admin/centres/create', // POST { facility, lanes[], memberships[], membershipSalesFlow }
    centreUpdate: '/admin/centres/update', // POST { centreId, facility } — edit facility / activate draft
    // Legacy model (ops dashboard + update/suspend/delete — not re-wired yet).
    list: '/admin/centres',
    wizardStart: '/admin/centres/wizard/start',
    wizardStep: (id: string, step: number) => `/admin/centres/wizard/${id}/step${step}`,
    wizardReview: (id: string) => `/admin/centres/wizard/${id}/review`,
    saveDraft: (id: string) => `/admin/centres/wizard/${id}/save-draft`,
    saveActivate: (id: string) => `/admin/centres/wizard/${id}/save-activate`,
    members: (id: string) => `/admin/centres/${id}/members`,
    bookings: (id: string) => `/admin/centres/${id}/bookings`,
  },
  memberships: {
    // Live backend — returns the facility's memberships (rich nested shape).
    // Pass the facility code via the `facilityCode` query param.
    list: '/admin/memberships',
    // Create a new GLOBAL plan template (flat body). POST.
    create: '/admin/memberships/create',
    // Create/update a membership (full nested body).
    update: '/admin/memberships/update',
  },
  membershipPlans: {
    list: '/admin/membership-plans',
    update: (id: string) => `/admin/membership-plans/${id}`,
    archive: (id: string) => `/admin/membership-plans/${id}/archive`,
  },
};

export default endpoints;
