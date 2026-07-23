import React from 'react';

import { DataTable, TableColumn } from '../../../components/Table';
import { SessionCentreRow, SessionsData } from '../../../store/reports/types';
import { centreColour, countryFlag } from '../../centres/constants';
import BarChart from '../components/BarChart';
import ChartCard from '../components/ChartCard';
import DonutChart from '../components/DonutChart';
import StatCard from '../components/StatCard';

const SESSION_COLORS: Record<string, string> = {
  batting: '#6366f1',
  bowling: '#3b82f6',
  coaching: '#10b981',
};

// No-show: lower is better — good (green) → watch (amber) → high (red).
const noshowPill = (v: number) => {
  const cls =
    v === 0
      ? 'bg-slate-100 text-slate-400'
      : v <= 5
        ? 'bg-emerald-50 text-emerald-600'
        : v <= 6.5
          ? 'bg-amber-50 text-amber-600'
          : 'bg-red-50 text-red-600';
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{v}%</span>;
};

const columns: TableColumn<SessionCentreRow>[] = [
  {
    id: 'centreName',
    label: 'Centre',
    sortable: true,
    renderCell: (v, row) => (
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: centreColour(row.centreId) }} />
        <span className="text-sm leading-none">{countryFlag(row.country)}</span>
        <span className="font-semibold text-gray-900">{String(v)}</span>
      </span>
    ),
  },
  {
    id: 'total',
    label: 'Total',
    align: 'right',
    sortable: true,
    renderCell: v => <b className="font-bold text-gray-900">{Number(v).toLocaleString()}</b>,
  },
  { id: 'batting', label: 'Batting', align: 'right', sortable: true },
  { id: 'bowling', label: 'Bowling', align: 'right', sortable: true },
  { id: 'coaching', label: 'Coaching', align: 'right', sortable: true },
  { id: 'avgDuration', label: 'Avg Duration (hrs)', align: 'right', sortable: true },
  { id: 'noshowPct', label: 'No-show', align: 'right', sortable: true, renderCell: v => noshowPill(Number(v)) },
];

const SessionsTab: React.FC<{ data: SessionsData }> = ({ data }) => {
  const { stats } = data;
  const donut = data.donutData.map(d => ({
    name: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    value: d.count,
    color: SESSION_COLORS[d.type] || '#6366f1',
    pct: d.pct,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="from-indigo-500 to-blue-500"
          subtitle="in period"
          title="Total Sessions"
          value={stats.totalSessions}
        />
        <StatCard
          accent="from-indigo-500 to-violet-500"
          subtitle="of sessions"
          title="Batting"
          value={`${stats.battingPct}%`}
        />
        <StatCard
          accent="from-blue-500 to-cyan-500"
          subtitle="of sessions"
          title="Bowling"
          value={`${stats.bowlingPct}%`}
        />
        <StatCard
          accent="from-emerald-500 to-teal-500"
          subtitle="of sessions"
          title="Coaching"
          value={`${stats.coachingPct}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard subtitle="Split by session type" title="Session Distribution">
          <DonutChart centerLabel="sessions" centerValue={stats.totalSessions} data={donut} />
        </ChartCard>
        <ChartCard subtitle="Batting vs bowling hours per centre" title="Session Hours by Centre">
          <BarChart
            bars={[
              { key: 'battingHrs', name: 'Batting', color: '#6366f1' },
              { key: 'bowlingHrs', name: 'Bowling', color: '#3b82f6' },
            ]}
            data={data.centreBarData}
            xKey="centreName"
          />
        </ChartCard>
      </div>

      <ChartCard subtitle="Per-centre session detail" title="Centre Sessions">
        <DataTable<SessionCentreRow>
          sortable
          columns={columns}
          data={data.centreTable}
          emptyState={{ title: 'No session data for these filters' }}
          getRowId={row => row.centreId}
        />
      </ChartCard>
    </div>
  );
};

export default SessionsTab;
