export interface GetSlotsRequest {
  date: string;
  facilityCode: string;
}

export interface BookingUser {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface BookingDetails {
  bookingId?: string;
  bookingCode?: string;
  user?: BookingUser;
  bookingStatus: string;
  guests: {
    name: string;
    email: string;
    isMember: boolean;
  }[];
  facilityPin: string;
  lanePin: string;
  coach: {
    name: string;
  };
}

export interface Slot {
  slotCode: string;
  startTime: string;
  endTime: string;
  status: string;
  isBooked: boolean;
  booking?: Partial<BookingDetails>;
  disableReason?: string;
  disabledAt?: string;
  // Admin userId (JWT sub) who blocked it — audit trail, not a display name.
  disabledBy?: string;
  // Display name typed in the Block modal's "Blocked by" field (defaults to the
  // logged-in user's name, editable — e.g. a shared/generic login used by
  // different physical staff). Shown in the modal as "Blocked by".
  disabledByName?: string;
}

export interface Lanes {
  laneCode: string;
  laneNo: number;
  laneType: 'batting' | 'hybrid';
  slots: Slot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface GetSlotsResponse {
  date: string;
  facilityCode: string;
  lanes: Lanes[];
  timeSlots: string[];
}

export interface UpdateLaneStatusRequest {
  date?: string;
  facilityCode?: string;
  laneCode?: string;
  action: string;
  reason?: string;
  slotCode?: string | string[];
  blockLaneApp?: boolean;
  startTime?: string;
  // Display name of who is blocking the slot — see Slot.disabledByName.
  blockedByName?: string;
}

export interface CoachSlotsRequest {
  startDate: string;
  endDate: string;
  facilityCode: string;
}

export interface CoachSlot {
  coachSlotCode: string;
  endTime: string;
  // `isAvailable: false` alone does NOT mean booked — it's also set on non-bookable
  // 'disabled' placeholder slots (e.g. off-hours). A real booking is identified by
  // status === 'confirmed' (equivalently, bookingId being set) — check that, not
  // isAvailable, to decide whether a slot represents an actual booking.
  isAvailable: boolean;
  startTime: string;
  status?: string;
  bookingId?: string;
  bookingCode?: string;
  bookingType?: string;
  // Lane the coach session is booked on, when known — parsed server-side from
  // the linked regular slot's code, display-only.
  laneNo?: number;
  // The member who booked this coach session — resolved server-side via bookingId,
  // same join the regular Slot Bookings calendar uses. Absent when the booking
  // doesn't resolve (a data-integrity gap, not a rendering issue).
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;
}

export interface Availability {
  date: string;
  isHoliday: boolean;
  slots: CoachSlot[];
}

export interface Coach {
  availability: Availability[];
  certifications: string[];
  coachCode: string;
  description: string;
  experienceYears: number;
  hourlyRate: number;
  name: string;
  profileImageUrl: string;
  specialization: string[];
}
export interface CoachSlotsResponse {
  bookingCode: string;
  bookingType: string;
  endDate: string;
  facilityCode: string;
  startDate: string;
  coaches: Coach[];
}

export interface SlotsInitialState {
  isLoading: boolean;
  error: string | null;
  slots: GetSlotsResponse | null;
  isBlockLaneLoading: boolean;
  coachSlotsList: CoachSlotsResponse[] | null;
}

export const initialState: SlotsInitialState = {
  isLoading: false,
  error: '',
  slots: null,
  isBlockLaneLoading: false,
  coachSlotsList: null,
};
