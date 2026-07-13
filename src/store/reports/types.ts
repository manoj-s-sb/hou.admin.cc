// Reports / Analytics — request + response contracts for GET /admin/reports.
// Response shapes differ per `tab`; each carries a shared `meta` block.

export type ReportTab = 'overview' | 'membership' | 'utilisation' | 'sessions' | 'capacity';
export type ReportView = 'network' | 'centre';
export type ReportPeriod = 'all' | '30d' | '90d' | '6m' | '1y' | 'custom';

export interface ReportsRequest {
  tab: ReportTab;
  view: ReportView;
  centreId?: string;
  country?: string;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
}

export interface ReportMeta {
  tab: ReportTab;
  view: ReportView;
  country: string;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  centreCount: number;
}

// ─── overview ──────────────────────────────────────────────────────────
export interface OverviewStats {
  totalMembers: number;
  totalBookingsHrs: number;
  utilisationPct: number;
  noshowPct: number;
  // Period-over-period trend %: new sign-ups this window vs the previous equal window.
  membersTrendPct: number;
  // Average booking hours per day in the window, and its trend vs the previous window.
  bookingsPerDay: number;
  bookingsTrendPct: number;
}
export interface MembershipGrowthPoint {
  month: string;
  newMembers: number;
  cancelled: number;
}
export interface CentreBookingRow {
  centreId: string;
  centreName: string;
  bookingHrs: number;
  color: string;
}
export interface CentreSummaryRow {
  centreId: string;
  centreName: string;
  country: string;
  members: number;
  active: number;
  bookingHrs: number;
  utilisationPct: number;
  noshowPct: number;
  status: string;
}
export interface OverviewData {
  stats: OverviewStats;
  membershipGrowth: MembershipGrowthPoint[];
  centreBookings: CentreBookingRow[];
  centreSummary: CentreSummaryRow[];
  meta: ReportMeta;
}

// ─── membership ────────────────────────────────────────────────────────
export interface PlanCard {
  planName: string;
  count: number;
  growthPct: number;
  percentageOfTotal: number;
}
export interface DonutSlice {
  planName: string;
  count: number;
  pct: number;
}
export interface MembershipDonut {
  total: number;
  plans: DonutSlice[];
}
export interface CentrePlanBreakdown {
  centreId: string;
  centreName: string;
  premium: number;
  standard: number;
  family: number;
  offPeak: number;
  nightOwl: number;
}
export interface MembershipData {
  planCards: PlanCard[];
  donutData: MembershipDonut;
  centreBreakdown: CentrePlanBreakdown[];
  meta: ReportMeta;
}

// ─── utilisation ───────────────────────────────────────────────────────
export interface UtilisationStats {
  avgUtilisation: number;
  peakHour: string;
  offPeakAvg: number;
  totalCapacityHrs: number;
}
export interface Heatmap {
  hours: string[];
  days: string[];
  data: number[][];
}
export interface CentreProgressRow {
  centreId: string;
  centreName: string;
  utilPct: number;
  color: string;
}
export interface CapacityUsageRow {
  centreId: string;
  centreName: string;
  capacity: number;
  active: number;
  noShows: number;
}
export interface UtilisationData {
  stats: UtilisationStats;
  heatmap: Heatmap;
  centreProgress: CentreProgressRow[];
  capacityUsage: CapacityUsageRow[];
  meta: ReportMeta;
}

// ─── sessions ──────────────────────────────────────────────────────────
export interface SessionStats {
  totalSessions: number;
  battingPct: number;
  bowlingPct: number;
  coachingPct: number;
}
export interface SessionDonutSlice {
  type: string;
  count: number;
  pct: number;
}
export interface SessionCentreBar {
  centreId: string;
  centreName: string;
  battingHrs: number;
  bowlingHrs: number;
}
export interface SessionCentreRow {
  centreId: string;
  centreName: string;
  country: string;
  total: number;
  batting: number;
  bowling: number;
  coaching: number;
  avgDuration: number;
  noshowPct: number;
}
export interface SessionsData {
  stats: SessionStats;
  donutData: SessionDonutSlice[];
  centreBarData: SessionCentreBar[];
  centreTable: SessionCentreRow[];
  meta: ReportMeta;
}

// ─── capacity ──────────────────────────────────────────────────────────
export interface CapacityStats {
  totalSlots: number;
  filledSlots: number;
  bufferPct: number;
  waitlistTotal: number;
}
export interface CapacityPlanBar {
  planName: string;
  used: number;
  max: number;
  color: string;
}
export interface CentreCapacityRing {
  centreId: string;
  centreName: string;
  members: number;
  totalCapacity: number;
  pct: number;
  color: string;
  plans: CapacityPlanBar[];
}
export interface PlanFillRate {
  planName: string;
  filled: number;
  max: number;
  color: string;
}
export interface WaitlistRow {
  label: string;
  count: number;
  max: number;
  color: string;
}
export interface CapacityData {
  stats: CapacityStats;
  centreCapacity: CentreCapacityRing[];
  planFillRates: PlanFillRate[];
  waitlist: WaitlistRow[];
  meta: ReportMeta;
}

export type ReportData = OverviewData | MembershipData | UtilisationData | SessionsData | CapacityData;

// ─── slice state ───────────────────────────────────────────────────────
export interface ReportsInitialState {
  data: ReportData | null;
  isLoading: boolean;
  error: string;
}

export const initialState: ReportsInitialState = {
  data: null,
  isLoading: false,
  error: '',
};
