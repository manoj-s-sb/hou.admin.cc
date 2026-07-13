/**
 * Shapes the reports API response (overview + membership tabs) into the flat model
 * the PDF renderer consumes. The analytics API tracks Active vs. Inactive members
 * per centre; Suspended/Expired member states aren't exposed, so they surface as 0
 * (and Inactive is derived as Total − Active).
 */
import type { MembershipData, OverviewData, ReportsRequest } from '../../../store/reports/types';

export interface PdfKpi {
  label: string;
  value: number;
  delta: number; // >0 up (green), <0 down (red), 0 neutral (gray)
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
export interface PdfCountry {
  flag: string;
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
  countries: PdfCountry[];
  insights: { top: string; warn: string };
}

const PLAN_PALETTE = ['#1baf7a', '#6b7280', '#eda100', '#e34948', '#6366f1'];
const REGION_PALETTE = ['#0C447C', '#1baf7a', '#eda100', '#e34948', '#6366f1', '#8b5cf6', '#06b6d4'];

const FLAGS: Record<string, string> = { US: '🇺🇸', IN: '🇮🇳', AU: '🇦🇺', GB: '🇬🇧' };
const flagOf = (c: string) => FLAGS[(c || '').toUpperCase()] ?? '🏳️';
const COUNTRY_NAME: Record<string, string> = {
  US: 'United States',
  IN: 'India',
  AU: 'Australia',
  GB: 'United Kingdom',
};
const countryName = (c: string) => COUNTRY_NAME[(c || '').toUpperCase()] ?? (c || '—');

const PERIOD_LABEL: Record<string, string> = {
  all: 'Full summary',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6m': 'Last 6 months',
  '1y': 'This year',
  custom: 'Custom range',
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
  const total = overview?.stats?.totalMembers ?? summary.reduce((s, c) => s + c.members, 0);
  const active = summary.reduce((s, c) => s + c.active, 0);
  const inactive = Math.max(0, total - active);
  const suspended = 0;
  const expired = 0;

  const growth = overview?.membershipGrowth ?? [];
  const netNew = growth.reduce((s, g) => s + (g.newMembers - g.cancelled), 0);
  const trend = growth.slice(-5).map(g => g.newMembers);
  while (trend.length < 5) trend.unshift(0);

  const kpis: PdfKpi[] = [
    { label: 'Total Members', value: total, delta: netNew > 0 ? 1 : netNew < 0 ? -1 : 0 },
    { label: 'Active', value: active, delta: active >= inactive ? 1 : -1 },
    { label: 'Inactive', value: inactive, delta: 0 },
    { label: 'Suspended', value: suspended, delta: 0 },
    { label: 'Expired', value: expired, delta: 0 },
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

  // Region distribution — members grouped by centre country.
  const regionMap: Record<string, number> = {};
  summary.forEach(c => {
    regionMap[c.country] = (regionMap[c.country] || 0) + c.members;
  });
  const regions: PdfRegion[] = Object.entries(regionMap).map(([code, count], i) => ({
    name: countryName(code),
    count,
    color: REGION_PALETTE[i % REGION_PALETTE.length],
  }));

  // Plan mix per country — join per-centre plan breakdown to its country.
  const centreCountry: Record<string, string> = {};
  summary.forEach(c => {
    centreCountry[c.centreId] = c.country;
  });
  const planByCountry: Record<string, Record<string, number>> = {};
  (membership?.centreBreakdown ?? []).forEach(b => {
    const ctry = centreCountry[b.centreId] || '—';
    const m = planByCountry[ctry] || (planByCountry[ctry] = {});
    m.Premium = (m.Premium || 0) + b.premium;
    m.Standard = (m.Standard || 0) + b.standard;
    m.Family = (m.Family || 0) + b.family;
    m['Off-Peak'] = (m['Off-Peak'] || 0) + b.offPeak;
  });
  const dominantPlan = (ctry: string): PdfBadge => {
    const m = planByCountry[ctry];
    if (!m) return { label: '—', color: '#6b7280' };
    const [top] = Object.entries(m).sort((a, b) => b[1] - a[1]);
    return top && top[1] > 0 ? badgeForPlan(top[0]) : { label: '—', color: '#6b7280' };
  };

  // Country rollup rows.
  const byCountry: Record<string, { total: number; active: number }> = {};
  summary.forEach(c => {
    const g = byCountry[c.country] || (byCountry[c.country] = { total: 0, active: 0 });
    g.total += c.members;
    g.active += c.active;
  });
  const countries: PdfCountry[] = Object.entries(byCountry).map(([code, g]) => ({
    flag: flagOf(code),
    name: countryName(code),
    total: g.total,
    active: g.active,
    inactive: Math.max(0, g.total - g.active),
    suspended: 0,
    expired: 0,
    activeRate: g.total ? Math.round((g.active / g.total) * 100) : 0,
    planMix: dominantPlan(code),
    trend,
  }));

  const byRate = [...countries].sort((a, b) => b.activeRate - a.activeRate);
  const topNames = byRate
    .slice(0, 2)
    .filter(c => c.activeRate >= 75)
    .map(c => `${c.name} (${c.activeRate}%)`);
  const lowNames = byRate.filter(c => c.activeRate < 60).map(c => `${c.name} (${c.activeRate}%)`);

  return {
    title: 'Membership Report',
    periodLabel: PERIOD_LABEL[req.period] ?? 'Last 30 days',
    generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    exportedBy,
    reportId: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    kpis,
    statuses,
    plans,
    regions,
    countries,
    insights: {
      top: topNames.length ? `Top active rate: ${topNames.join(', ')}.` : 'Active rates are steady across regions.',
      warn: lowNames.length
        ? `Low active rate: ${lowNames.join(', ')} — review renewals.`
        : 'No regions below the 60% active-rate threshold.',
    },
  };
}
