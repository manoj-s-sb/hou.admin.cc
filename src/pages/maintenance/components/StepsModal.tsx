import React from 'react';

import type { TemplateStep } from '../../../store/maintenance/types';

interface Props {
  title: string;
  steps: TemplateStep[];
  videoUrl?: string | null;
  onClose: () => void;
}

/** Read-only step-by-step guide + optional explainer video for a template. */
const StepsModal: React.FC<Props> = ({ title, steps, videoUrl, onClose }) => {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[650] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-[#1a2340] px-6 py-4">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-bold text-white">{title}</div>
            <div className="mt-0.5 text-[12px] text-white/60">
              {ordered.length} step{ordered.length === 1 ? '' : 's'}
              {videoUrl ? ' · Video available' : ''}
            </div>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {videoUrl && (
            <video controls className="w-full rounded-xl bg-black" src={videoUrl}>
              <track kind="captions" />
            </video>
          )}
          {ordered.length === 0 ? (
            <p className="text-[13px] italic text-gray-400">No steps defined for this task.</p>
          ) : (
            ordered.map((step, i) => (
              <div key={step.stepId || i} className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#21295A] text-[12px] font-bold text-white">
                    {i + 1}
                  </div>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap pt-1 text-[13px] font-medium leading-relaxed text-gray-800">
                    {step.title}
                  </p>
                </div>
                {step.imageUrl && (
                  <a className="mt-2.5 block pl-10" href={step.imageUrl} rel="noreferrer" target="_blank">
                    <img
                      alt={`Step ${i + 1}`}
                      className="max-h-56 w-auto rounded-lg border border-gray-200 object-cover hover:opacity-90"
                      src={step.imageUrl}
                    />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepsModal;
