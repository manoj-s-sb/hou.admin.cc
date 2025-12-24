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
  guests?: any[];
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
  reason: string;
  slotCode?: string;
}

export interface CoachSlotsRequest {
  date?: string;
  facilityCode: string;
}

export interface CoachSlot {
  coachSlotCode: string;
  endTime: string;
  isAvailable: boolean;
  startTime: string;
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
  endDate: string;
  facilityCode: string;
  startDate: string;
  coaches: Coach[];
}

export interface SlotsInitialState {
  isLoading: boolean;
  error: string | null | any;
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
