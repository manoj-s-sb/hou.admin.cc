const endpoints = {
  slots: {
    list: '/admin/slots/calendar',
    updateLaneStatus: '/admin/slots/status/update',
    coachSlots: '/admin/coach/calendar',
    updateCoachSlots: 'admin/coach/status/update',
  },
  login: '/admin/auth/login',
  me: '/admin/auth/me',
  members: {
    list: '/admin/members/list',
    membersDetails: '/admin/member/details',
    membersCount: '/admin/members/stats',
  },
  tour: {
    updateTourStatus: '/admin/bookings/tour/status/update',
  },
  // Maintenance & Tasks — ONE action-dispatched endpoint. Body always carries an
  // `action` (list_templates | create_template | update_template | archive_template |
  // restore_template | get_template | list_schedules | schedule_task | complete_task |
  // flag_issue | unschedule_task | upload_url) plus that action's `payload`.
  maintenance: '/admin/maintenance',
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
    // Generates a new temp password and emails it — body-based { staffId }, matching
    // the rest of these mutation routes.
    resendWelcomeEmail: '/admin/staff/resend-welcome-email',
    // BACKEND TODO: persist a new staff role to the DB and return the created RoleConfig.
    roleCreate: '/admin/staff/roles/create',
    // BACKEND TODO: persist a new access level and return the created AccessLevelConfig.
    accessLevelCreate: '/admin/staff/access-levels/create',
    // GET ?roles=<comma-separated role ids> → { moduleId: verbs }, unioned across roles.
    roleDefaults: '/admin/staff/role-defaults',
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
    waitlist: '/admin/centres/waitlist', // POST { facilityCode, subscriptionSrc?, registerdVia?, page, limit }
    leads: '/admin/centres/leads', // POST { facilityCode, action?, subscription_code?, page, limit }
    waitlistNotesAdd: '/admin/centres/waitlist/notes/add', // POST { facilityCode, waitlistId, text, createdByName }
    // POST { facilityCode, waitlistId, status, changedByName } — status is one of
    // not_contacted/contacted/no_response/converted/not_interested
    waitlistStatusUpdate: '/admin/centres/waitlist/status/update',
    // POST { facilityCode, subscriptionSrc, entries: [{name,email,phone?,countryCode?,registerdVia?,timestamp?}] }
    // — "Import from Excel". Rows with an email that already exists (on this centre, or earlier in
    // the same upload) are skipped, not rejected — response reports createdCount/skippedCount/skipped.
    waitlistImport: '/admin/centres/waitlist/import',
    leadsNotesAdd: '/admin/centres/leads/notes/add', // POST { facilityCode, leadId, text, createdByName }
    // POST { facilityCode, leadId, status, changedByName } — status is one of
    // not_contacted/contacted/no_response/converted/not_interested
    leadsStatusUpdate: '/admin/centres/leads/status/update',
    // POST { facilityCode, name, email, phone?, planInterest? } — extra="forbid" on
    // the backend, so no other fields (e.g. createdByName) may be sent.
    leadsCreate: '/admin/centres/leads/create',
  },
  memberships: {
    // Live backend — returns the facility's memberships (rich nested shape).
    // Pass the facility code via the `facilityCode` query param.
    list: '/admin/memberships',
    // Create a new GLOBAL plan template (flat body). POST.
    create: '/admin/memberships/create',
    // Create/update a membership (full nested body).
    update: '/admin/memberships/update',
    // Daily FX rates for the network reference-price currency conversion.
    // GET → { base: 'USD', rates: { AUD: n, INR: n, … }, asOf?: 'YYYY-MM-DD' }.
    fxRates: '/admin/fxrates',
  },
  membershipPlans: {
    list: '/admin/membership-plans',
    update: (id: string) => `/admin/membership-plans/${id}`,
    archive: (id: string) => `/admin/membership-plans/${id}/archive`,
  },
  // Tickets / Incidents — ONE action-dispatched endpoint. Body always carries an
  // `action` (create | list | get | updateStatus | acknowledge | comment |
  // addAttachment | reassign | counts) plus that action's payload.
  tickets: '/admin/tickets',
  // Reports / Analytics — ONE GET endpoint. Filters (tab, view, centreId, country,
  // period, startDate, endDate) are passed as query params; the `tab` selects the
  // response shape (overview | membership | utilisation | sessions | capacity).
  reports: '/admin/reports',
};

export default endpoints;
