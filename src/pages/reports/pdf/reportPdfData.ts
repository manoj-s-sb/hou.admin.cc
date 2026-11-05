/**
 * Shapes the reports API response (overview + membership tabs) into the flat model
 * the PDF renderer consumes. The analytics API tracks Active vs. Inactive members
 * per centre; Suspended/Expired member states aren't exposed, so they surface as 0
 * (and Inactive is derived as Total − Active).
 */
import type { MembershipData, OverviewData, ReportTab, ReportsRequest } from '../../../store/reports/types';

export interface PdfKpi {
  label: string;
  value: number;
  /** Real trend % vs the previous period; null when there's no genuine trend
   * value for this KPI (no fabricated 0%/arrow — the card just omits the delta row). */
  delta: number | null;
}
export interface PdfStatus {
  key: 'active' | 'inactive' | 'suspended' | 'expired';
  label: string;
  count: number;
  pct: number;
}
export interface PdfPlan {
  name: string;
  color: string;
  count: number;
  pct: number;
}
export interface PdfRegion {
  name: string;
  count: number;
  color: string;
}
export interface PdfBadge {
  label: string;
  color: string;
}
/** One row in the breakdown table — a single, real centre (not a country
 * rollup blending several centres together, which hid exactly which centre
 * needed attention and showed a country name instead of anything the admin
 * had actually picked a centre by). */
export interface PdfCentre {
  code: string;
  name: string;
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  expired: number;
  activeRate: number;
  planMix: PdfBadge;
  trend: number[];
}
export interface PdfReportData {
  title: string;
  periodLabel: string;
  generatedDate: string;
  exportedBy: string;
  reportId: string;
  kpis: PdfKpi[];
  statuses: PdfStatus[];
  plans: PdfPlan[];
  regions: PdfRegion[];
  centres: PdfCentre[];
  insights: { top: string; warn: string };
}

const PLAN_PALETTE = ['#1baf7a', '#6b7280', '#eda100', '#e34948', '#6366f1'];
const REGION_PALETTE = ['#0C447C', '#1baf7a', '#eda100', '#e34948', '#6366f1', '#8b5cf6', '#06b6d4'];

const PERIOD_LABEL: Record<string, string> = {
  all: 'Full summary',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6m': 'Last 6 months',
  '1y': 'This year',
  custom: 'Custom range',
};

// The export always renders the Membership-shaped layout (KPIs, plan mix, centre
// table) regardless of which tab triggered it — only the title changes, so the
// PDF never claims to be a different report than what's actually in it.
const TAB_REPORT_TITLE: Record<ReportTab, string> = {
  overview: 'Overview Report',
  membership: 'Membership Report',
  utilisation: 'Utilisation Report',
  sessions: 'Sessions Report',
  capacity: 'Capacity Report',
};

// Plan-mix badge colours per the spec (Premium green, Standard gray, Basic amber, Trial red).
const badgeForPlan = (label: string): PdfBadge => {
  const l = label.toLowerCase();
  if (l.includes('premium')) return { label, color: '#1baf7a' };
  if (l.includes('standard')) return { label, color: '#6b7280' };
  if (l.includes('family')) return { label, color: '#eda100' };
  return { label, color: '#e34948' };
};

const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export function buildPdfData(
  overview: OverviewData | null,
  membership: MembershipData | null,
  req: ReportsRequest,
  exportedBy: string
): PdfReportData {
  const summary = overview?.centreSummary ?? [];
  // True total (incl. inactive) comes from the per-centre `members` sum, not
  // `stats.totalMembers` — that field is the Overview KPI's headline number and
  // is itself active-only (RP-2), so reusing it here would silently zero out
  // the Inactive figure below instead of showing the real active/inactive split.
  const total = summary.reduce((s, c) => s + c.members, 0);
  const active = summary.reduce((s, c) => s + c.active, 0);
  const inactive = Math.max(0, total - active);
  const suspended = 0;
  const expired = 0;

  // Real trend % — the same FS-160-corrected value the dashboard itself shows
  // (point-in-time count vs the previous period), not a fabricated +1/-1 sign.
  // Only Total Members has a genuine network-wide trend source today; the
  // other statuses have no equivalent, so their delta is omitted rather than
  // showing an invented arrow next to "vs last period".
  const membersTrendPct = overview?.stats.membersTrendPct ?? null;

  const kpis: PdfKpi[] = [
    { label: 'Total Members', value: total, delta: membersTrendPct },
    { label: 'Active', value: active, delta: null },
    { label: 'Inactive', value: inactive, delta: null },
    { label: 'Suspended', value: suspended, delta: null },
    { label: 'Expired', value: expired, delta: null },
  ];

  const statuses: PdfStatus[] = [
    { key: 'active', label: 'Active', count: active, pct: pctOf(active, total) },
    { key: 'inactive', label: 'Inactive', count: inactive, pct: pctOf(inactive, total) },
    { key: 'suspended', label: 'Suspended', count: suspended, pct: pctOf(suspended, total) },
    { key: 'expired', label: 'Expired', count: expired, pct: pctOf(expired, total) },
  ];

  const plans: PdfPlan[] = (membership?.planCards ?? []).map((p, i) => ({
    name: p.planName,
    count: p.count,
    pct: p.percentageOfTotal,
    color: PLAN_PALETTE[i % PLAN_PALETTE.length],
  }));

  // Member distribution — one slice per real centre, not a country rollup.
  const regions: PdfRegion[] = summary.map((c, i) => ({
    name: c.centreName,
    count: c.members,
    color: REGION_PALETTE[i % REGION_PALETTE.length],
  }));

  // Plan mix per centre — join per-centre plan breakdown directly by centreId
  // (no country indirection — every centre is already its own row).
  const planByCentre: Record<string, Record<string, number>> = {};
  (membership?.centreBreakdown ?? []).forEach(b => {
    const m = planByCentre[b.centreId] || (planByCentre[b.centreId] = {});
    m.Premium = (m.Premium || 0) + b.premium;
    m.Standard = (m.Standard || 0) + b.standard;
    m.Family = (m.Family || 0) + b.family;
    m['Off-Peak'] = (m['Off-Peak'] || 0) + b.offPeak;
  });
  const dominantPlan = (centreId: string): PdfBadge => {
    const m = planByCentre[centreId];
    if (!m) return { label: '—', color: '#6b7280' };
    const [top] = Object.entries(m).sort((a, b) => b[1] - a[1]);
    return top && top[1] > 0 ? badgeForPlan(top[0]) : { label: '—', color: '#6b7280' };
  };

  // Centre breakdown rows — one per real centre (matches whatever the Reports
  // filters resolved to: a single picked centre, or every centre on "All Centres").
  // Each row's sparkline uses THIS centre's own growth series (c.growth), not a
  // single network-wide array shared by every row.
  const centres: PdfCentre[] = summary.map(c => {
    const centreTrend = (c.growth ?? []).slice(-5).map(g => g.newMembers);
    while (centreTrend.length < 5) centreTrend.unshift(0);
    return {
      code: c.centreId,
      name: c.centreName,
      total: c.members,
      active: c.active,
      inactive: Math.max(0, c.members - c.active),
      suspended: 0,
      expired: 0,
      activeRate: c.members ? Math.round((c.active / c.members) * 100) : 0,
      planMix: dominantPlan(c.centreId),
      trend: centreTrend,
    };
  });

  const byRate = [...centres].sort((a, b) => b.activeRate - a.activeRate);
  const topNames = byRate
    .slice(0, 2)
    .filter(c => c.activeRate >= 75)
    .map(c => `${c.name} (${c.activeRate}%)`);
  const lowNames = byRate.filter(c => c.activeRate < 60).map(c => `${c.name} (${c.activeRate}%)`);

  return {
    title: TAB_REPORT_TITLE[req.tab] ?? 'Overview Report',
    periodLabel: PERIOD_LABEL[req.period] ?? 'Last 30 days',
    generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    exportedBy,
    // Timestamp (not just the date) + a short random suffix so two exports on the
    // same day never collide on the same Report ID.
    reportId: `RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    kpis,
    statuses,
    plans,
    regions,
    centres,
    insights: {
      // No centre above target isn't "steady" — it's worth calling out, not
      // papering over with a falsely reassuring default.
      top: topNames.length
        ? `Top active rate: ${topNames.join(', ')}.`
        : 'No centres above the 75% active-rate target.',
      warn: lowNames.length
        ? `Low active rate: ${lowNames.join(', ')} — review renewals.`
        : 'No centres below the 60% active-rate threshold.',
    },
  };
}
