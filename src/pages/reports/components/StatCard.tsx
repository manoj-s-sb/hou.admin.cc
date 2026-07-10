import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  // Optional trend indicator (e.g. growth %). positive → green up, else red down.
  trend?: { value: number; positive?: boolean };
  accent?: string; // tailwind gradient classes, e.g. "from-indigo-500 to-blue-500"
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  accent = 'from-indigo-500 to-blue-500',
  icon,
}) => {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-[18px] shadow-sm transition-all duration-300 hover:shadow-lg">
      <div
        className={`absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-all duration-300 group-hover:scale-150`}
      />
      <div className="relative">
        <div className="mb-1.5 flex items-start justify-between">
          <h3 className="text-[12.5px] font-semibold text-gray-600">{title}</h3>
          {icon && (
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow`}>
              {icon}
            </div>
          )}
        </div>
        <p className="text-[26px] font-bold leading-none text-gray-900">{displayValue}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                trend.positive ?? trend.value >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {(trend.positive ?? trend.value >= 0) ? '▲' : '▼'} {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && <span className="text-xs font-medium text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
