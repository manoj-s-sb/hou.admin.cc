import { Induction } from '../induction/types';
import { Coach, GetSlotsResponse } from '../slots/types';

import { EVENT_TYPE_CONFIG } from './eventTypeConfig';
import {
  extractCoachBookingEvents,
  extractSlotBookingEvents,
  mergeCalendarEvents,
  normalizeInductionEvent,
  normalizeTourEvent,
} from './normalize';

const inductionBooking = (overrides: Partial<Induction> = {}): Induction => ({
  userId: 'user-1',
  email: 'jane@example.com',
  firstName: 'Jane',
  subscriptionStatus: 'active',
  lastName: 'Doe',
  onboardingType: 'individual',
  facilityCode: 'HOU01',
  timeSlot: { startTime: '2026-01-05T10:00:00-06:00', endTime: '2026-01-05T10:30:00-06:00' },
  slotCode: 'IN-1',
  status: 'confirmed',
  bookingCode: 'IN-260105-ABC123',
  isInductionCompleted: false,
  profileImageUrl: '',
  members: [],
  ...overrides,
});

const coach = (overrides: Partial<Coach> = {}): Coach => ({
  coachCode: 'C001',
  name: 'Ashraf Hosein',
  specialization: [],
  experienceYears: 10,
  certifications: [],
  hourlyRate: 50,
  description: '',
  profileImageUrl: '',
  availability: [],
  ...overrides,
});

describe('normalizeInductionEvent', () => {
  it('maps an induction booking into the common event shape', () => {
    const event = normalizeInductionEvent(inductionBooking());

    expect(event).toEqual(
      expect.objectContaining({
        id: 'induction-IN-260105-ABC123',
        title: 'Jane Doe',
        start: '2026-01-05T10:00:00-06:00',
        end: '2026-01-05T10:30:00-06:00',
        type: 'induction',
        color: EVENT_TYPE_CONFIG.induction.color,
      })
    );
    expect(event?.meta).toMatchObject({ bookingCode: 'IN-260105-ABC123' });
  });

  it('falls back to the userId-based id when bookingCode is missing', () => {
    const event = normalizeInductionEvent(inductionBooking({ bookingCode: '' }));
    expect(event?.id).toBe('induction-user-1');
  });

  it('returns null when the time slot is missing/invalid', () => {
    expect(normalizeInductionEvent(inductionBooking({ timeSlot: { startTime: '', endTime: '' } }))).toBeNull();
    expect(
      normalizeInductionEvent(inductionBooking({ timeSlot: { startTime: 'not-a-date', endTime: 'also-not' } }))
    ).toBeNull();
  });

  it('falls back to a generic title when the name is blank', () => {
    const event = normalizeInductionEvent(inductionBooking({ firstName: '', lastName: '' }));
    expect(event?.title).toBe('Induction');
  });
});

describe('normalizeTourEvent', () => {
  it('maps a tour booking into the common event shape with type "tour"', () => {
    const event = normalizeTourEvent(inductionBooking({ bookingCode: 'TB-1' }));

    expect(event?.type).toBe('tour');
    expect(event?.id).toBe('tour-TB-1');
    expect(event?.color).toBe(EVENT_TYPE_CONFIG.tour.color);
  });
});

describe('extractCoachBookingEvents', () => {
  it('produces one event per real (status=confirmed) booking, skipping available AND disabled slots', () => {
    const coaches: Coach[] = [
      coach({
        availability: [
          {
            date: '2026-01-05',
            isHoliday: false,
            slots: [
              {
                coachSlotCode: 'S1',
                startTime: '2026-01-05T09:00:00-06:00',
                endTime: '2026-01-05T09:45:00-06:00',
                isAvailable: false,
                status: 'confirmed',
                bookingId: 'booking_123',
                memberName: 'Dave Mathews',
                memberEmail: 'dave@example.com',
                memberPhone: '5551234',
              },
              {
                coachSlotCode: 'S2',
                startTime: '2026-01-05T10:00:00-06:00',
                endTime: '2026-01-05T10:45:00-06:00',
                isAvailable: true,
                status: 'available',
              },
              {
                // isAvailable=false is ALSO set on non-bookable "disabled" placeholder
                // slots (e.g. off-hours) — must not be treated as a booking.
                coachSlotCode: 'S3',
                startTime: '2026-01-05T23:00:00-06:00',
                endTime: '2026-01-05T23:45:00-06:00',
                isAvailable: false,
                status: 'disabled',
              },
            ],
          },
        ],
      }),
    ];

    const events = extractCoachBookingEvents(coaches);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'coach-S1',
        type: 'coach_booking',
        color: EVENT_TYPE_CONFIG.coach_booking.color,
        // Title shows the MEMBER who booked (person-first, same convention as
        // Slot Booking/Induction/Tour) — not the coach's own name.
        title: 'Dave Mathews',
      })
    );
    expect(events[0].meta).toMatchObject({
      coachName: 'Ashraf Hosein',
      memberName: 'Dave Mathews',
      memberEmail: 'dave@example.com',
      memberPhone: '5551234',
    });
  });

  it('falls back to a generic title when the member name is unresolved (e.g. an orphaned bookingId)', () => {
    const coaches: Coach[] = [
      coach({
        availability: [
          {
            date: '2026-01-05',
            isHoliday: false,
            slots: [
              {
                coachSlotCode: 'S1',
                startTime: '2026-01-05T09:00:00-06:00',
                endTime: '2026-01-05T09:45:00-06:00',
                isAvailable: false,
                status: 'confirmed',
                bookingId: 'booking_orphaned',
              },
            ],
          },
        ],
      }),
    ];

    const events = extractCoachBookingEvents(coaches);
    expect(events[0].title).toBe('Coach Booking');
  });

  it('returns an empty array for no coaches / no availability', () => {
    expect(extractCoachBookingEvents([])).toEqual([]);
    expect(extractCoachBookingEvents([coach()])).toEqual([]);
  });
});

const slotBookingDay = (overrides: Partial<GetSlotsResponse> = {}): GetSlotsResponse => ({
  date: '2026-01-05',
  facilityCode: 'HOU01',
  lanes: [
    {
      laneCode: 'LANE_HOU01_L1',
      laneNo: 1,
      laneType: 'batting',
      slots: [
        {
          slotCode: 'S1',
          startTime: '2026-01-05T09:00:00-06:00',
          endTime: '2026-01-05T09:45:00-06:00',
          status: 'confirmed',
          isBooked: true,
          booking: {
            bookingId: 'bk-1',
            bookingCode: 'BK-1',
            bookingStatus: 'confirmed',
            user: { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', phone: '5551234' },
            guests: [],
            facilityPin: '',
            lanePin: '',
            coach: { name: '' },
          },
        },
        {
          slotCode: 'S2',
          startTime: '2026-01-05T10:00:00-06:00',
          endTime: '2026-01-05T10:45:00-06:00',
          status: 'available',
          isBooked: false,
        },
      ],
    },
  ],
  timeSlots: ['09:00', '10:00'],
  ...overrides,
});

describe('extractSlotBookingEvents', () => {
  it('produces one event per booked slot, skipping unbooked slots', () => {
    const events = extractSlotBookingEvents([slotBookingDay()]);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        id: 'booking-BK-1',
        type: 'booking',
        color: EVENT_TYPE_CONFIG.booking.color,
        title: 'Sam Lee',
      })
    );
  });

  it('falls back to the slotCode-based id when bookingCode is missing', () => {
    const day = slotBookingDay();
    const [bookedSlot] = day.lanes[0].slots;
    if (bookedSlot.booking) bookedSlot.booking.bookingCode = '';
    const events = extractSlotBookingEvents([day]);
    expect(events[0].id).toBe('booking-S1');
  });

  it('returns an empty array for no days / no bookings', () => {
    expect(extractSlotBookingEvents([])).toEqual([]);
    const emptyDay = slotBookingDay();
    emptyDay.lanes[0].slots = [];
    expect(extractSlotBookingEvents([emptyDay])).toEqual([]);
  });
});

describe('mergeCalendarEvents', () => {
  it('merges all four sources into one list, sorted by start time (coach bookings last within a day)', () => {
    const later = inductionBooking({
      bookingCode: 'IN-LATER',
      timeSlot: { startTime: '2026-01-06T09:00:00-06:00', endTime: '2026-01-06T09:30:00-06:00' },
    });
    const earlier = inductionBooking({
      bookingCode: 'TB-EARLIER',
      timeSlot: { startTime: '2026-01-04T09:00:00-06:00', endTime: '2026-01-04T09:30:00-06:00' },
    });
    const coaches: Coach[] = [
      coach({
        availability: [
          {
            date: '2026-01-05',
            isHoliday: false,
            slots: [
              {
                coachSlotCode: 'S1',
                startTime: '2026-01-05T09:00:00-06:00',
                endTime: '2026-01-05T09:45:00-06:00',
                isAvailable: false,
              },
            ],
          },
        ],
      }),
    ];
    const slotBookingDays = [slotBookingDay()];

    const events = mergeCalendarEvents([later], [earlier], coaches, slotBookingDays);

    // coach-S1 and booking-BK-1 are on the same day (2026-01-05) at the same
    // 09:00 start time — coach_booking sorts after other types within a day.
    expect(events.map(e => e.id)).toEqual(['tour-TB-EARLIER', 'booking-BK-1', 'coach-S1', 'induction-IN-LATER']);
  });

  it('drops entries with invalid time slots instead of throwing', () => {
    const events = mergeCalendarEvents([inductionBooking({ timeSlot: { startTime: '', endTime: '' } })], [], []);
    expect(events).toEqual([]);
  });

  it('handles empty inputs for every source', () => {
    expect(mergeCalendarEvents([], [], [], [])).toEqual([]);
  });
});
