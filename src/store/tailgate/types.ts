export type TailgateEventType = 'Entry' | 'Exit' | 'Tailgate';
export type TailgateStatus = 'pending' | 'reviewed' | 'violation';

export interface TailgateLog {
  id: string;
  date: string;
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
}

export interface TailgateStats {
  today_total: number;
  today_date: string;
  today_entries: number;
  today_tailgates: number;
  total_unidentified: number;
  total_violations: number;
}

export interface TailgateState {
  isLoading: boolean;
  error: string | null;
  logs: TailgateLog[];
  stats: TailgateStats;
}

export const initialState: TailgateState = {
  isLoading: false,
  error: null,
  logs: [],
  stats: {
    today_total: 0,
    today_date: '',
    today_entries: 0,
    today_tailgates: 0,
    total_unidentified: 0,
    total_violations: 0,
  },
};
