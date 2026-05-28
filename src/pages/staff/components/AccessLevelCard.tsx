import React from 'react';

import { AccessLevelConfig } from '../types';

interface AccessLevelCardProps {
  level: AccessLevelConfig;
  selected: boolean;
  onSelect: () => void;
}

const AccessLevelCard: React.FC<AccessLevelCardProps> = ({ level, selected, onSelect }) => {
  return (
    <button
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition ${
        selected ? 'border-[#21295A] ring-2 ring-[#21295A]/15' : 'border-gray-100 hover:border-gray-300'
      }`}
      type="button"
      onClick={onSelect}
    >
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} />
          <span className="text-[13px] font-bold text-[#21295A]">{level.label}</span>
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${level.color}1A`, color: level.color }}
          >
            {level.scope}
          </span>
        </span>
        <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">{level.description}</span>
      </span>
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected ? 'border-[#21295A]' : 'border-gray-300'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-[#21295A]" />}
      </span>
    </button>
  );
};

export default AccessLevelCard;
