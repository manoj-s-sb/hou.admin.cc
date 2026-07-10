import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// White rounded card wrapper for a chart/table section (mirrors the Dashboard's ChartCard).
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, action, className = '', children }) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm font-medium text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
};

export default ChartCard;
