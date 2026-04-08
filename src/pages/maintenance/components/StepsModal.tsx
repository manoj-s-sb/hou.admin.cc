import { Work, WorkStep } from '../../../store/maintenance/types';

interface StepsModalProps {
  item: Work;
  onClose: () => void;
}

const StepsModal = ({ item, onClose }: StepsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <p className="text-base font-bold text-gray-900">{item.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{item.steps?.length || 0} steps</p>
        </div>
        <button
          className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          type="button"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto px-6 py-6">
        {item.steps && item.steps.length > 0 ? (
          <div className="flex flex-col">
            {item.steps.map((step: WorkStep, index: number) => (
              <div key={step.stepId} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#21295A] text-xs font-bold text-white">
                    {step.order}
                  </div>
                  {index < item.steps.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200" style={{ minHeight: '28px' }} />
                  )}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-medium text-gray-800">{step.title}</p>
                  {step.imageUrl && (
                    <img
                      alt={`Step ${step.order}`}
                      className="mt-2 rounded-lg object-cover"
                      src={step.imageUrl}
                      style={{ maxHeight: 140 }}
                    />
                  )}
                  {step.videoUrl && (
                    <a
                      className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      href={step.videoUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch video
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">No steps available.</p>
        )}
      </div>
    </div>
  </div>
);

export default StepsModal;
