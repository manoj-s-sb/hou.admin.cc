export interface TailgateActor {
  id: string;
  name: string;
  type: string;
}

export interface TailgateDoor {
  id: string;
  name: string;
}

export interface TailgateDetection {
  personCount: number;
  verdict: string;
  reason: string;
  isTailgate: boolean;
  trackIds: number[];
  processingTimems: number;
  direction: {
    entries: number;
    exits: number;
  };
}

export interface TailgateReview {
  reviewed: boolean;
  reviewedById: string;
  reviewedByName: string;
  reviewedAt: string;
  comment: string;
  memberName: string | null;
  memberType: string | null;
  memberId: string | null;
  isViolation: boolean | null;
  subscription: string | null;
  actualEventType: string | null;
}

export interface TailgateLog {
  id: string;
  eventId: string;
  timeStamp: string;
  timeStampms: number;
  eventType: string;
  actor: TailgateActor | null;
  door: TailgateDoor | null;
  detection: TailgateDetection | null;
  videoUrl: string | null;
  snapshotUrl: string | null;
  review: TailgateReview | null;
}

export interface CreateTailgateEventRequest {
  fromDate?: string;
  toDate?: string;
  eventType?: string;
  memberName?: string;
  laneDoor?: string;
}

export interface TailgateStats {
  facilityCode: string;
  todayDate: string;
  todayTotal: number;
  todayEntries: number;
  todayTailgates: number;
  totalUnidentified: number;
  totalViolations: number;
}

export interface TailgateState {
  isLoading: boolean;
  error: string | null;
  logs: TailgateLog[];
  stats: TailgateStats | null;
  statsLoading: boolean;
  statsError: string | null;
}

export const initialState: TailgateState = {
  isLoading: false,
  error: null,
  logs: [],
  stats: null,
  statsLoading: false,
  statsError: null,
};
