// Every request path in this app is served behind an `/api` prefix (see the
// backend's host.json routePrefix) — added once here so REACT_APP_API_BASE_URL
// (.env.development/.env.uat/.env.production) never needs to know about it.
const API_PREFIX = '/api';

const endpoints = {
  slots: {
    list: `${API_PREFIX}/admin/slots/calendar`,
    updateLaneStatus: `${API_PREFIX}/admin/slots/status/update`,
    coachSlots: `${API_PREFIX}/admin/coach/calendar`,
    updateCoachSlots: `${API_PREFIX}/admin/coach/status/update`,
  },
  login: `${API_PREFIX}/admin/auth/login`,
  me: `${API_PREFIX}/admin/auth/me`,
  members: {
    list: `${API_PREFIX}/admin/members/list`,
    membersDetails: `${API_PREFIX}/admin/member/details`,
    membersCount: `${API_PREFIX}/admin/members/stats`,
  },
  tour: {
    updateTourStatus: `${API_PREFIX}/admin/bookings/tour/status/update`,
  },
  // Maintenance & Tasks — ONE action-dispatched endpoint. Body always carries an
  // `action` (list_templates | create_template | update_template | archive_template |
  // restore_template | get_template | list_schedules | schedule_task | complete_task |
  // flag_issue | unschedule_task | upload_url) plus that action's `payload`.
  maintenance: `${API_PREFIX}/admin/maintenance`,
  tailgate: {
    createEvent: `${API_PREFIX}/admin/tailgate/events`,
    review: `${API_PREFIX}/admin/tailgate/review`,
    stats: `${API_PREFIX}/admin/tailgate/stats`,
  },
  staff: {
    config: `${API_PREFIX}/admin/staff/config`,
    list: `${API_PREFIX}/admin/staff/list`,
    create: `${API_PREFIX}/admin/staff/create`,
    details: `${API_PREFIX}/admin/staff/details`,
    update: `${API_PREFIX}/admin/staff/update`,
    // Generates a new temp password and emails it — body-based { staffId }, matching
    // the rest of these mutation routes.
    resendWelcomeEmail: `${API_PREFIX}/admin/staff/resend-welcome-email`,
    // BACKEND TODO: persist a new staff role to the DB and return the created RoleConfig.
    roleCreate: `${API_PREFIX}/admin/staff/roles/create`,
    // BACKEND TODO: persist a new access level and return the created AccessLevelConfig.
    accessLevelCreate: `${API_PREFIX}/admin/staff/access-levels/create`,
    // GET ?roles=<comma-separated role ids> → { moduleId: verbs }, unioned across roles.
    roleDefaults: `${API_PREFIX}/admin/staff/role-defaults`,
  },
  induction: {
    list: `${API_PREFIX}/admin/bookings/list`,
    search: `${API_PREFIX}/admin/induction/search`,
    update: `${API_PREFIX}/admin/induction/status/update`,
    updateBookingStatus: `${API_PREFIX}/admin/induction/bookingstatus/update`,
    activateSubscription: `${API_PREFIX}/subscription/admin/activate`,
    userInductionDetails: `${API_PREFIX}/admin/induction/details`,
  },
  centres: {
    // New doc-bundle model (live backend) — all POST.
    centresList: `${API_PREFIX}/admin/centres/list`, // POST { status?, search?, skip, limit, sort, order }
    centreDetails: `${API_PREFIX}/admin/centres/details`, // POST { code }
    centreCreate: `${API_PREFIX}/admin/centres/create`, // POST { facility, lanes[], memberships[], membershipSalesFlow }
    centreUpdate: `${API_PREFIX}/admin/centres/update`, // POST { centreId, facility } — edit facility / activate draft
    // Legacy model (ops dashboard + update/suspend/delete — not re-wired yet).
    list: `${API_PREFIX}/admin/centres`,
    wizardStart: `${API_PREFIX}/admin/centres/wizard/start`,
    wizardStep: (id: string, step: number) => `${API_PREFIX}/admin/centres/wizard/${id}/step${step}`,
    wizardReview: (id: string) => `${API_PREFIX}/admin/centres/wizard/${id}/review`,
    saveDraft: (id: string) => `${API_PREFIX}/admin/centres/wizard/${id}/save-draft`,
    saveActivate: (id: string) => `${API_PREFIX}/admin/centres/wizard/${id}/save-activate`,
    members: (id: string) => `${API_PREFIX}/admin/centres/${id}/members`,
    bookings: (id: string) => `${API_PREFIX}/admin/centres/${id}/bookings`,
    waitlist: `${API_PREFIX}/admin/centres/waitlist`, // POST { facilityCode, subscriptionSrc?, registerdVia?, page, limit }
    leads: `${API_PREFIX}/admin/centres/leads`, // POST { facilityCode, action?, subscription_code?, page, limit }
    waitlistNotesAdd: `${API_PREFIX}/admin/centres/waitlist/notes/add`, // POST { facilityCode, waitlistId, text, createdByName }
    // POST { facilityCode, subscriptionSrc, entries: [{name,email,phone?,countryCode?,registerdVia?,timestamp?}] }
    // — "Import from Excel". Rows with an email that already exists (on this centre, or earlier in
    // the same upload) are skipped, not rejected — response reports createdCount/skippedCount/skipped.
    waitlistImport: `${API_PREFIX}/admin/centres/waitlist/import`,
    leadsNotesAdd: `${API_PREFIX}/admin/centres/leads/notes/add`, // POST { facilityCode, leadId, text, createdByName }
    // POST { facilityCode, name, email, phone?, planInterest? } — extra="forbid" on
    // the backend, so no other fields (e.g. createdByName) may be sent.
    leadsCreate: `${API_PREFIX}/admin/centres/leads/create`,
  },
  memberships: {
    // Live backend — returns the facility's memberships (rich nested shape).
    // Pass the facility code via the `facilityCode` query param.
    list: `${API_PREFIX}/admin/memberships`,
    // Create a new GLOBAL plan template (flat body). POST.
    create: `${API_PREFIX}/admin/memberships/create`,
    // Create/update a membership (full nested body).
    update: `${API_PREFIX}/admin/memberships/update`,
    // Daily FX rates for the network reference-price currency conversion.
    // GET → { base: 'USD', rates: { AUD: n, INR: n, … }, asOf?: 'YYYY-MM-DD' }.
    fxRates: `${API_PREFIX}/admin/fxrates`,
  },
  membershipPlans: {
    list: `${API_PREFIX}/admin/membership-plans`,
    update: (id: string) => `${API_PREFIX}/admin/membership-plans/${id}`,
    archive: (id: string) => `${API_PREFIX}/admin/membership-plans/${id}/archive`,
  },
  // Tickets / Incidents — ONE action-dispatched endpoint. Body always carries an
  // `action` (create | list | get | updateStatus | acknowledge | comment |
  // addAttachment | reassign | counts) plus that action's payload.
  tickets: `${API_PREFIX}/admin/tickets`,
  // Reports / Analytics — ONE GET endpoint. Filters (tab, view, centreId, country,
  // period, startDate, endDate) are passed as query params; the `tab` selects the
  // response shape (overview | membership | utilisation | sessions | capacity).
  reports: `${API_PREFIX}/admin/reports`,

};

export default endpoints;
