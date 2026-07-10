import React from 'react';

import { DataTable, TableColumn } from '../../../components/Table';
import { CentreSummaryRow, OverviewData } from '../../../store/reports/types';
import { centreColour, countryFlag } from '../../centres/constants';
import BarChart from '../components/BarChart';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';

// Rounded chip used for the status / utilisation / no-show cells.
const chip = (text: string, cls: string) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>
);

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-teal-50 text-teal-600',
    staging: 'bg-amber-50 text-amber-600',
    draft: 'bg-gray-100 text-gray-500',
    suspended: 'bg-red-50 text-red-600',
  };
  const cls = map[(status || '').toLowerCase()] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status || '—'}
    </span>
  );
};

// Utilisation: healthy (green) → mid (amber) → low/idle (neutral).
const utilPill = (v: number) =>
  chip(
    `${v}%`,
    v >= 75
      ? 'bg-emerald-50 text-emerald-600'
      : v >= 55
        ? 'bg-amber-50 text-amber-600'
        : v > 0
          ? 'bg-slate-100 text-slate-500'
          : 'bg-slate-100 text-slate-400'
  );

// No-show: lower is better — good (green) → watch (amber) → high (red).
const noshowPill = (v: number) =>
  chip(
    `${v}%`,
    v === 0
      ? 'bg-slate-100 text-slate-400'
      : v <= 5
        ? 'bg-emerald-50 text-emerald-600'
        : v <= 6.5
          ? 'bg-amber-50 text-amber-600'
          : 'bg-red-50 text-red-600'
  );

const columns: TableColumn<CentreSummaryRow>[] = [
  {
    id: 'centreName',
    label: 'Centre',
    sortable: true,
    renderCell: (v, row) => (
      <span className="flex items-center gap-2">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ background: centreColour(row.centreId) }}
        />
        <span className="text-sm leading-none">{countryFlag(row.country)}</span>
        <span className="font-semibold text-gray-900">{String(v)}</span>
      </span>
    ),
  },
  { id: 'country', label: 'Country', renderCell: v => (v ? String(v).toUpperCase() : '—') },
  { id: 'members', label: 'Members', align: 'right', sortable: true, renderCell: v => <b className="font-bold text-gray-900">{Number(v).toLocaleString()}</b> },
  { id: 'active', label: 'Active', align: 'right', sortable: true, renderCell: v => Number(v).toLocaleString() },
  { id: 'bookingHrs', label: 'Bookings', align: 'right', sortable: true, renderCell: v => `${Number(v).toLocaleString()} hrs` },
  { id: 'utilisationPct', label: 'Utilisation', align: 'right', sortable: true, renderCell: v => utilPill(Number(v)) },
  { id: 'noshowPct', label: 'No-show', align: 'right', sortable: true, renderCell: v => noshowPill(Number(v)) },
  { id: 'status', label: 'Status', renderCell: v => statusPill(String(v)) },
];

const OverviewTab: React.FC<{ data: OverviewData }> = ({ data }) => {
  const { stats } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="from-indigo-500 to-blue-500"
          subtitle="vs previous period"
          title="Total Members"
          trend={{ value: stats.membersTrendPct, positive: stats.membersTrendPct >= 0 }}
          value={stats.totalMembers}
        />
        <StatCard
          accent="from-violet-500 to-purple-500"
          subtitle="hrs / day · vs previous period"
          title="Booking Hours / Day"
          trend={{ value: stats.bookingsTrendPct, positive: stats.bookingsTrendPct >= 0 }}
          value={stats.bookingsPerDay}
        />
        <StatCard accent="from-emerald-500 to-teal-500" subtitle="slots filled" title="Utilisation" value={`${stats.utilisationPct}%`} />
        <StatCard accent="from-rose-500 to-red-500" subtitle="of bookings" title="No-show Rate" value={`${stats.noshowPct}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard subtitle="New vs cancelled, by month" title="Membership Growth">
          <BarChart
            bars={[
              { key: 'newMembers', name: 'New', color: '#6366f1' },
              { key: 'cancelled', name: 'Cancelled', color: '#ef4444' },
            ]}
            data={data.membershipGrowth}
            xKey="month"
          />
        </ChartCard>
        <ChartCard subtitle="Total booking hours per centre" title="Bookings by Centre">
          <BarChart
            bars={[{ key: 'bookingHrs', name: 'Booking hrs', color: '#6366f1' }]}
            colorByPoint
            data={data.centreBookings}
            showLegend={false}
            xKey="centreName"
          />
        </ChartCard>
      </div>

      <ChartCard subtitle="Per-centre rollup" title="Centre Summary">
        <DataTable<CentreSummaryRow>
          columns={columns}
          data={data.centreSummary}
          emptyState={{ title: 'No centres match these filters' }}
          getRowId={row => row.centreId}
          sortable
        />
      </ChartCard>
    </div>
  );
};

export default OverviewTab;
