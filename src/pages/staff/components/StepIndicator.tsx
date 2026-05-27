import React from 'react';

import { StepKey } from '../types';

interface StepIndicatorProps {
  steps: { key: StepKey; label: string }[];
  activeKey: StepKey;
  onSelect: (key: StepKey) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, activeKey, onSelect }) => {
  const activeIndex = steps.findIndex(s => s.key === activeKey);

  return (
    <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
      {steps.map((step, idx) => {
        const isActive = step.key === activeKey;
        const isDone = idx < activeIndex;
        return (
          <React.Fragment key={step.key}>
            <button
              aria-current={isActive ? 'step' : undefined}
              className="flex items-center gap-2 rounded-md p-1 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21295A]/30"
              type="button"
              onClick={() => onSelect(step.key)}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                  isActive
                    ? 'bg-[#21295A] text-white'
                    : isDone
                      ? 'bg-[#21295A]/20 text-[#21295A]'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {idx + 1}
              </span>
              <span className={`text-[12px] font-semibold ${isActive ? 'text-[#21295A]' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
