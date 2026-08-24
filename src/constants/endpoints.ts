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
  induction: {
    list: '/admin/bookings/list',
    search: '/admin/induction/search',
    update: '/admin/induction/status/update',
    activateSubscription: 'subscription/admin/activate',
    userInductionDetails: '/admin/induction/details',
  },
  waitlist: {
    list: '/admin/centres/waitlist',
    notesAdd: '/admin/centres/waitlist/notes/add',
    import: '/admin/centres/waitlist/import',
  },
  leads: {
    list: '/admin/centres/leads',
    notesAdd: '/admin/centres/leads/notes/add',
    create: '/admin/centres/leads/create',
  },
};

export default endpoints;
