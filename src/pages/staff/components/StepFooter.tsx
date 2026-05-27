import React from 'react';

interface StepFooterProps {
  canGoBack: boolean;
  isLastStep: boolean;
  nextStepLabel?: string;
  isEditMode: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSave: () => void;
}

const StepFooter: React.FC<StepFooterProps> = ({
  canGoBack,
  isLastStep,
  nextStepLabel,
  isEditMode,
  isSubmitting,
  onBack,
  onNext,
  onCancel,
  onSaveDraft,
  onSave,
}) => {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
      <button
        className="text-[12px] font-semibold text-gray-500 transition hover:text-gray-800 disabled:opacity-40"
        disabled={!canGoBack}
        type="button"
        onClick={onBack}
      >
        ← Back
      </button>
      {!isLastStep ? (
        <button
          className="rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
          type="button"
          onClick={onNext}
        >
          Next: {nextStepLabel} →
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          {!isEditMode && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
              disabled={isSubmitting}
              type="button"
              onClick={onSaveDraft}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                />
                <path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
              </svg>
              Save as Draft
            </button>
          )}
          <button
            className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
            disabled={isSubmitting}
            type="button"
            onClick={onSave}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </svg>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save & Share'}
          </button>
        </div>
      )}
    </div>
  );
};

export default StepFooter;
