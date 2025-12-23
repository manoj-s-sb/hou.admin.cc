const endpoints = {
  slots: {
    list: '/admin/slots/calendar',
    updateLaneStatus: '/admin/slots/status/update',
    coachSlots: '/admin/coach/calendar',
  },
  login: '/admin/auth/login',
  members: {
    list: '/admin/members/list',
    membersDetails: '/admin/member/details',
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
};

export default endpoints;
