import React from 'react';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
  pct?: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
}

// SVG donut (recharts Pie) with a centre label and a fill-bar legend beside it.
const DonutChart: React.FC<DonutChartProps> = ({ data, centerLabel, centerValue, height = 260 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer height={height} width={height}>
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={hasData ? data : [{ name: 'No data', value: 1, color: '#e5e7eb' }]}
              dataKey="value"
              endAngle={-270}
              innerRadius="66%"
              outerRadius="100%"
              paddingAngle={hasData ? 2 : 0}
              startAngle={90}
              stroke="none"
            >
              {(hasData ? data : [{ color: '#e5e7eb' }]).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{centerValue ?? total.toLocaleString()}</span>
          {centerLabel && <span className="text-xs font-medium text-gray-500">{centerLabel}</span>}
        </div>
      </div>

      <div className="flex-1 space-y-2 self-stretch">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="w-28 truncate text-sm font-medium text-gray-600">{d.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${total ? (d.value / total) * 100 : 0}%`,
                  backgroundColor: d.color,
                }}
              />
            </div>
            <span className="w-16 text-right text-sm font-bold text-gray-900">
              {typeof d.pct === 'number' ? `${d.pct}%` : d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
