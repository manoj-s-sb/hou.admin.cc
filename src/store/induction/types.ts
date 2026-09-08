export interface InductionListRequest {
  /** Exact single day (YYYY-MM-DD). Leave empty and pass startDate+endDate instead
   * for a range — the backend rejects an empty date with neither set, so the
   * caller must always provide one or the other, never date: ''. */
  date: string;
  /** Inclusive range start (YYYY-MM-DD) — pass together with endDate when date is empty. */
  startDate?: string;
  /** Inclusive range end (YYYY-MM-DD) — pass together with startDate when date is empty. */
  endDate?: string;
  page: number;
  type: string;
  listLimit: number;
  /** Free-text filter — matches name, email, or phone (partial, case-insensitive). */
  search?: string;
  status?: string;
  /** Omit for the global (all-centres) view; pass to scope to one centre. */
  facilityCode?: string;
}

export interface InductionStepsDetailsRequest {
  userId: string;
}

export interface UpdateInductionStepsRequest {
  userId: string;
  subSteps: { id: string; status: string }[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface InductionMember {
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
  isInductionCompleted: boolean;
}

export interface Induction {
  userId: string;
  email: string;
  firstName: string;
  subscriptionStatus: string;
  lastName: string;
  onboardingType: string;
  facilityCode: string;
  timeSlot: TimeSlot;
  slotCode: string;
  status: string;
  bookingCode: string;
  isInductionCompleted: boolean;
  profileImageUrl: string;
  subscriptionCode?: string;
  members: InductionMember[];
}

export interface InductionResponse {
  bookings: Induction[];
  total: number;
  page: number;
  limit: number;
}

export interface SubStep {
  id: string;
  status: string;
  required: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

export interface InductionStep {
  id: string;
  status: string;
  required: boolean;
  subSteps: SubStep[];
  completedAt: string | null;
  completedBy: string | null;
}

export interface InductionStepResponse {
  status: string;
  message: string;
  data: InductionStep;
  statusCode: string;
}

export interface UpdateTourStatusRequest {
  userId: string;
  bookingCode: string;
  status: string;
}

export interface InductionState {
  isLoading: boolean;
  error: string | null;
  inductionList: InductionResponse;
  selectedInduction: Induction | null;
  inductionStep: InductionStep | null;
  userInductionDetails: Induction | null;
}

export const initialState: InductionState = {
  isLoading: false,
  error: '',
  inductionList: {
    bookings: [],
    total: 0,
    page: 0,
    limit: 0,
  },
  userInductionDetails: null,
  selectedInduction: null,
  inductionStep: null,
};
