export interface InductionListRequest {
  date: string;
  page: number;
  type: string;
  listLimit: number;
}

export interface InductionStepsDetailsRequest {
  userId: string;
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
  lastName: string;
  onboardingType: string;
  facilityCode: string;
  timeSlot: TimeSlot;
  slotCode: string;
  status: string;
  bookingCode: string;
  isInductionCompleted: boolean;
  profileImageUrl: string;
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

export interface InductionState {
  isLoading: boolean;
  error: string | null;
  inductionList: InductionResponse;
  selectedInduction: Induction | null;
  inductionStep: InductionStep | null;
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
  selectedInduction: null,
  inductionStep: null,
};
