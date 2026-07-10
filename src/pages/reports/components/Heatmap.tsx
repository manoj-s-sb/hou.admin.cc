import React from 'react';

interface HeatmapProps {
  days: string[];
  hours: string[];
  data: number[][]; // data[dayIndex][hourIndex] = utilisation %
}

// Indigo intensity scale for a 0–100 value.
const cellColor = (pct: number): string => {
  if (pct <= 0) return '#f8fafc';
  const alpha = 0.12 + (Math.min(pct, 100) / 100) * 0.88;
  return `rgba(99, 102, 241, ${alpha.toFixed(2)})`;
};

// Pure CSS/SVG-free grid of coloured cells with a hover tooltip (title attr) and axis labels.
const Heatmap: React.FC<HeatmapProps> = ({ days, hours, data }) => {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* hour axis */}
        <div className="flex">
          <div className="w-12 shrink-0" />
          {hours.map(h => (
            <div key={h} className="flex-1 px-0.5 text-center text-[10px] font-semibold text-gray-400">
              {h.slice(0, 2)}
            </div>
          ))}
        </div>
        {/* rows */}
        {days.map((day, r) => (
          <div key={day} className="mt-1 flex items-center">
            <div className="w-12 shrink-0 pr-2 text-right text-[11px] font-semibold text-gray-500">{day}</div>
            {hours.map((h, c) => {
              const pct = data?.[r]?.[c] ?? 0;
              return (
                <div key={`${day}-${h}`} className="flex-1 px-0.5">
                  <div
                    className="h-7 rounded-[4px] transition-transform hover:scale-110"
                    style={{ backgroundColor: cellColor(pct) }}
                    title={`${day} ${h} · ${pct}% utilised`}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {/* legend */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="text-[11px] font-medium text-gray-400">Low</span>
          <div className="flex gap-0.5">
            {[0, 20, 40, 60, 80, 100].map(v => (
              <span key={v} className="h-3 w-6 rounded-sm" style={{ backgroundColor: cellColor(v) }} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
};

export default Heatmap;
