import React from 'react';

export interface ProgressItem {
  label: string;
  value: number;         // numerator (e.g. filled / used / util%)
  max?: number;          // denominator; when omitted, `value` is treated as a 0–100 pct
  color?: string;
  valueLabel?: string;   // overrides the right-side label
  sublabel?: string;
}

interface ProgressListProps {
  items: ProgressItem[];
}

// Reusable list of labelled horizontal progress bars.
const ProgressList: React.FC<ProgressListProps> = ({ items }) => {
  return (
    <div className="space-y-4">
      {items.map(item => {
        const pct = item.max && item.max > 0 ? Math.min((item.value / item.max) * 100, 100) : Math.min(item.value, 100);
        const color = item.color || '#6366f1';
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900">
                {item.valueLabel ?? (item.max ? `${item.value}/${item.max}` : `${item.value}%`)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            {item.sublabel && <p className="mt-1 text-xs font-medium text-gray-400">{item.sublabel}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressList;
