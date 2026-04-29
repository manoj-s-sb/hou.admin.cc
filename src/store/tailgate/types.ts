export type TailgateEventType = 'Entry' | 'Exit' | 'Tailgate';
export type TailgateStatus   = 'pending' | 'reviewed' | 'violation';
export type PersonType       = 'Member' | 'Non-Member';
export type SubscriptionType = 'Standard' | 'Premium' | 'Family' | 'Offpeak';

export interface TailgateReview {
  reviewed:        boolean;
  reviewedById:    string;
  reviewedByName:  string;
  reviewedAt:      string;
  comment:         string;
  memberName:      string | null;
  memberType:      string | null;
  memberId:        string | null;
  subscription:    string | null;
  isViolation:     boolean | null;
  actualEventType: string | null;
}

export interface TailgateLog {
  id: string;
  cosmosId: string;
  review: TailgateReview | null;
  date: string;
  sortTs: number;
  dateVal: string;
  t: string;
  ev: TailgateEventType;
  gate: string;
  name: string | null;
  actorId: string | null;
  actorType: string | null;
  memberId: string | null;
  ini: string;
  ab: string;
  ac: string;
  status: TailgateStatus;
  viol: boolean;
  notes: string | null;
  tr: string;
  videoUrl: string | null;
  snapshotUrl: string | null;
  personCount: number | null;
  personName: string | null;
  personType: PersonType | null;
  personMemberId: string | null;
  subscription: SubscriptionType | null;
}

export interface CreateTailgateEventRequest {
  from_date?: string;
  to_date?: string;
  event_type?: string;
  member_name?: string;
  lane_door?: string;
}

export interface TailgateState {
  isLoading: boolean;
  error: string | null;
  logs: TailgateLog[];
}

export const initialState: TailgateState = {
  isLoading: false,
  error: null,
  logs: [],
};
