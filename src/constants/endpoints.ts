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
  },
  induction: {
    list: '/admin/bookings/list',
    search: '/admin/induction/search',
    update: '/admin/induction/status/update',
    updateBookingStatus: '/admin/induction/bookingstatus/update',
    activateSubscription: 'subscription/admin/activate',
    userInductionDetails: '/admin/induction/details',
  },
};

export default endpoints;
