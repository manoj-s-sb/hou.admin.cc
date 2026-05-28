import React from 'react';

import { GENERIC_ROLE_ICON, ROLE_ICON_MAP } from '../constants';
import { RoleConfig } from '../types';

interface RoleCardProps {
  role: RoleConfig;
  selected: boolean;
  onToggle: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onToggle }) => {
  return (
    <button
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition ${
        selected ? 'border-[#21295A] ring-2 ring-[#21295A]/15' : 'border-gray-100 hover:border-gray-300'
      }`}
      type="button"
      onClick={onToggle}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: role.iconBg, color: role.iconColor }}
      >
        {ROLE_ICON_MAP[role.id] ?? GENERIC_ROLE_ICON}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-bold text-[#21295A]">{role.label}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-gray-500">{role.description}</span>
      </span>
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
          selected ? 'border-[#21295A] bg-[#21295A]' : 'border-gray-300 bg-white'
        }`}
      >
        {selected && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
          </svg>
        )}
      </span>
    </button>
  );
};

export default RoleCard;
