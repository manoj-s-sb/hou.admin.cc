import React from 'react';

import { MembershipData } from '../../../store/reports/types';
import BarChart from '../components/BarChart';
import ChartCard from '../components/ChartCard';
import DonutChart from '../components/DonutChart';
import StatCard from '../components/StatCard';

const PLAN_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const ACCENTS = ['from-indigo-500 to-blue-500', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'];

const MembershipTab: React.FC<{ data: MembershipData }> = ({ data }) => {
  const donut = data.donutData.plans.map((p, i) => ({
    name: p.planName,
    value: p.count,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
    pct: p.pct,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {data.planCards.map((card, i) => (
          <StatCard
            key={card.planName}
            accent={ACCENTS[i % ACCENTS.length]}
            subtitle={`${card.percentageOfTotal}% of total`}
            title={card.planName}
            trend={{ value: card.growthPct, positive: card.growthPct >= 0 }}
            value={card.count}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard subtitle="Share of members by plan" title="Plan Distribution">
          <DonutChart centerLabel="members" centerValue={data.donutData.total} data={donut} />
        </ChartCard>
        <ChartCard subtitle="Members per plan, per centre" title="Per-Centre Plan Breakdown">
          <BarChart
            bars={[
              { key: 'premium', name: 'Premium', color: '#6366f1', stackId: 'plans' },
              { key: 'standard', name: 'Standard', color: '#3b82f6', stackId: 'plans' },
              { key: 'family', name: 'Family', color: '#10b981', stackId: 'plans' },
              { key: 'offPeak', name: 'Off-Peak', color: '#f59e0b', stackId: 'plans' },
              { key: 'nightOwl', name: 'Night Owl', color: '#8b5cf6', stackId: 'plans' },
            ]}
            data={data.centreBreakdown}
            xKey="centreName"
          />
        </ChartCard>
      </div>
    </div>
  );
};

export default MembershipTab;
