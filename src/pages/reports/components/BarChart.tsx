import React from 'react';

import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  BarChart as ReBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BarSeries {
  key: string;
  name: string;
  color: string;
  stackId?: string; // shared stackId ⇒ stacked bars
}

interface BarChartProps {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- chart rows are dynamic */
  data: any[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  // Per-bar colors from a `color` field on each row (single-series charts).
  colorByPoint?: boolean;
  showLegend?: boolean;
  showValueLabels?: boolean;
}

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  fontSize: '13px',
} as const;

const axisStyle = { fontSize: '12px', fontWeight: 600 } as const;

// Truncate long category labels so every tick fits (full value stays in the tooltip).
const truncate = (s: string, n = 15): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- recharts injects x/y/payload */
const CategoryTick = ({ x, y, payload }: any) => (
  <text fill="#6b7280" fontSize={11} fontWeight={600} textAnchor="middle" x={x} y={y + 12}>
    {truncate(String(payload?.value ?? ''))}
  </text>
);

const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  bars,
  height = 300,
  colorByPoint = false,
  showLegend = true,
  showValueLabels = false,
}) => {
  return (
    <ResponsiveContainer height={height} width="100%">
      <ReBarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          interval={0}
          stroke="#6b7280"
          style={axisStyle}
          tick={<CategoryTick />}
          tickLine={false}
        />
        <YAxis allowDecimals={false} stroke="#6b7280" style={axisStyle} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
        {showLegend && bars.length > 1 && <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 600 }} />}
        {bars.map(series => (
          <Bar
            key={series.key}
            dataKey={series.key}
            fill={series.color}
            label={showValueLabels ? { position: 'top', fontSize: 11, fill: '#6b7280' } : undefined}
            name={series.name}
            radius={series.stackId ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            stackId={series.stackId}
          >
            {colorByPoint && data.map((entry, i) => <Cell key={i} fill={entry.color || series.color} />)}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
