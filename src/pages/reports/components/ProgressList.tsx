import React from 'react';

export interface ProgressItem {
  label: string;
  value: number; // numerator (e.g. filled / used / util%)
  max?: number; // denominator; when omitted, `value` is treated as a 0–100 pct
  color?: string;
  valueLabel?: string; // overrides the right-side label
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
        // Real fill can exceed 100% (e.g. a plan with more active members than its
        // configured capacity) — the bar's width still clamps to its box, but the
        // label must show the true number, in red, rather than a misleading 100%.
        const rawPct = item.max && item.max > 0 ? (item.value / item.max) * 100 : item.value;
        const barPct = Math.min(100, Math.max(0, rawPct));
        const overCapacity = rawPct > 100;
        const color = overCapacity ? '#ef4444' : item.color || '#6366f1';
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className={`text-sm font-bold ${overCapacity ? 'text-red-600' : 'text-gray-900'}`}>
                {item.valueLabel ?? `${Math.round(rawPct)}%`}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barPct}%`, backgroundColor: color }}
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
