import React from 'react';

interface CapacityRingProps {
  pct: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

// SVG progress ring using stroke-dasharray (no chart library).
const CapacityRing: React.FC<CapacityRingProps> = ({
  pct,
  color = '#6366f1',
  size = 120,
  strokeWidth = 10,
  centerLabel,
  centerValue,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(pct, 100));
  const dash = (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg height={size} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#f0f0f0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-bold text-gray-900" style={{ fontSize: Math.max(10, size * 0.18) }}>
          {centerValue ?? `${Math.round(clamped)}%`}
        </span>
        {centerLabel && (
          <span className="mt-0.5 font-medium text-gray-500" style={{ fontSize: Math.max(8, size * 0.14) }}>
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default CapacityRing;
