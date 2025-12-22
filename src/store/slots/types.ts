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
  date: string;
  facilityCode: string;
  laneCode: string;
  action: string;
  reason: string;
  slotCode?: string;
}

export interface SlotsInitialState {
  isLoading: boolean;
  error: string | null | any;
  slots: GetSlotsResponse | null;
  isBlockLaneLoading: boolean;
}

export const initialState: SlotsInitialState = {
  isLoading: false,
  error: '',
  slots: null,
  isBlockLaneLoading: false,
};
