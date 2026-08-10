import React from 'react';

import { UtilisationData } from '../../../store/reports/types';
import BarChart from '../components/BarChart';
import ChartCard from '../components/ChartCard';
import Heatmap from '../components/Heatmap';
import ProgressList from '../components/ProgressList';
import StatCard from '../components/StatCard';

const UtilisationTab: React.FC<{ data: UtilisationData }> = ({ data }) => {
  const { stats } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          accent="from-indigo-500 to-blue-500"
          subtitle="slots filled"
          title="Avg Utilisation"
          value={stats.avgUtilisation === null ? '—' : `${stats.avgUtilisation}%`}
        />
        <StatCard
          accent="from-violet-500 to-purple-500"
          subtitle="busiest slot"
          title="Peak Hour"
          value={stats.peakHour}
        />
        <StatCard
          accent="from-emerald-500 to-teal-500"
          subtitle="non-peak hours"
          title="Off-Peak Avg"
          value={`${stats.offPeakAvg}%`}
        />
        <StatCard
          accent="from-amber-500 to-orange-500"
          subtitle="in period"
          title="Total Capacity Hours"
          value={stats.totalCapacityHrs}
        />
      </div>

      <ChartCard subtitle="Utilisation intensity by day and hour" title="Utilisation Heatmap">
        <Heatmap data={data.heatmap.data} days={data.heatmap.days} hours={data.heatmap.hours} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard subtitle="Slots filled vs available" title="Per-Centre Utilisation">
          <ProgressList
            items={data.centreProgress.map(c => ({
              label: c.centreName,
              // Null (not configured) renders as an empty bar with a "—" label, not "0%".
              value: c.utilPct ?? 0,
              color: c.color,
              valueLabel: c.utilPct === null ? '—' : `${c.utilPct}%`,
            }))}
          />
        </ChartCard>
        <ChartCard subtitle="Capacity vs active vs no-shows" title="Capacity Usage">
          <BarChart
            bars={[
              { key: 'capacity', name: 'Capacity', color: '#c7d2fe' },
              { key: 'active', name: 'Active', color: '#6366f1' },
              { key: 'noShows', name: 'No-shows', color: '#ef4444' },
            ]}
            data={data.capacityUsage}
            xKey="centreName"
          />
        </ChartCard>
      </div>
    </div>
  );
};

export default UtilisationTab;
