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
  /** RP-1: network view defaults to Active centres only. Set true to also
   * include Draft/Staging/Suspended centres (e.g. QA/test ones) in the totals. */
  includeNonActive?: boolean;
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
  /** Total booking COUNT for the period (PRD KPI: "18,654 bookings") — not hours.
   * totalBookingsHrs below is the separate hours-sum used by the per-centre breakdowns. */
  totalBookings: number;
  totalBookingsHrs: number;
  /** Network-wide average; null when no centre in scope is configured for it yet. */
  utilisationPct: number | null;
  noshowPct: number;
  /** Trend % of the active-member COUNT vs the same count at the end of the
   * previous equal window — null when there's no previous-period baseline
   * (e.g. Full summary, or the previous window had none), shown as "New"/"—". */
  membersTrendPct: number | null;
  /** Trend % of totalBookings vs the previous equal window; null for the same
   * no-baseline reason as membersTrendPct. */
  bookingsTrendPct: number | null;
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
  /** Null when this centre isn't configured for utilisation yet. */
  utilisationPct: number | null;
  noshowPct: number;
  status: string;
  /** This centre's own new-vs-cancelled series (PDF sparkline) — not the
   * network-wide one shared by every centre. */
  growth: MembershipGrowthPoint[];
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
  /** null when there's no previous-period baseline to compare against (shown as "New"/"—"). */
  growthPct: number | null;
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
  /** Network-wide average; null when no centre in scope is configured for it yet. */
  avgUtilisation: number | null;
  peakHour: string;
  /** The peak hour's own utilisation %, same formula as avgUtilisation — null
   * when no centre in scope is configured for it yet. */
  peakHourPct: number | null;
  /** null when no centre in scope is configured for it yet. */
  offPeakAvg: number | null;
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
  /** Null when this centre isn't configured for utilisation yet. */
  utilPct: number | null;
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
  /** null when totalCapacity isn't configured — show "—"/"Capacity not set",
   * never 0%, which would misread as "no members". */
  pct: number | null;
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
  /** Signup source (e.g. "Launch Waitlist", "Foundation") — the closest thing
   * to a "plan" a prospective-member waitlist entry has. */
  sublabel?: string;
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
