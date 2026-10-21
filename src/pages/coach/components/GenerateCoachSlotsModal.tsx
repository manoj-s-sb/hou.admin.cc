import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { generateCoachSlots } from '../../../store/slots/api';
import { AppDispatch } from '../../../store/store';

interface GenerateCoachSlotsModalProps {
  coachCode: string;
  coachName: string;
  facilityCode: string;
  dispatch: AppDispatch;
  onApplied: () => void;
  onClose: () => void;
  /** Defaults to 'coach'. 'staff' only swaps the wording here — the actual
   * generate action is provided via onMockGenerate below (no real staff
   * backend exists yet; this is a frontend-only preview). */
  personnelType?: 'coach' | 'staff';
  /** When provided (Staff Schedule's mock mode), used INSTEAD of dispatching
   * generateCoachSlots — simulates a created/skipped count locally with no
   * network call. */
  onMockGenerate?: (startDate: string, endDate: string) => { createdCount: number; skippedCount: number };
}

/**
 * Fills in missing coachslot inventory for this coach over a plain,
 * contiguous calendar-date range — separate from the grid's click/drag
 * Available/Unavailable + Induction editor, which only works on slots that
 * already exist. CenturyBackend normally pre-creates coachslot documents on
 * its own schedule; this is only for when the admin needs to set
 * availability further out than that schedule has reached yet.
 */
const GenerateCoachSlotsModal: React.FC<GenerateCoachSlotsModalProps> = ({
  coachCode,
  coachName,
  facilityCode,
  dispatch,
  onApplied,
  onClose,
  personnelType = 'coach',
  onMockGenerate,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const personnelLabel = personnelType === 'staff' ? 'staff member' : 'coach';

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error('Pick both a start date and an end date');
      return;
    }
    if (endDate < startDate) {
      toast.error('End date must be on or after the start date');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onMockGenerate) {
        const data = onMockGenerate(startDate, endDate);
        toast.success(
          `Created ${data.createdCount} new slot${data.createdCount === 1 ? '' : 's'} for ${startDate} – ${endDate}${
            data.skippedCount > 0 ? ` (${data.skippedCount} already existed)` : ''
          }`
        );
        onApplied();
        onClose();
        return;
      }
      const resultAction = await dispatch(generateCoachSlots({ facilityCode, coachCode, startDate, endDate }));
      if (generateCoachSlots.fulfilled.match(resultAction)) {
        const data = resultAction.payload;
        toast.success(
          `Created ${data.createdCount} new slot${data.createdCount === 1 ? '' : 's'} for ${startDate} – ${endDate}${
            data.skippedCount > 0 ? ` (${data.skippedCount} already existed)` : ''
          }`
        );
        onApplied();
        onClose();
      } else {
        toast.error((resultAction.payload as string) || 'Failed to generate slots');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-[15px] font-bold text-[#21295A]">Generate slots — {coachName}</h3>
          <button className="text-gray-400 hover:text-gray-600" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-[12px] text-gray-500">
            Creates missing time slots for this {personnelLabel} over a date range, so you can then set availability for
            dates further out than what&apos;s already been generated. New slots start out Unavailable — mark them
            Available afterward from the grid.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                htmlFor="generate-start-date"
              >
                Start date
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-[#21295A] outline-none focus:border-[#21295A]"
                id="generate-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                htmlFor="generate-end-date"
              >
                End date
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-[#21295A] outline-none focus:border-[#21295A]"
                id="generate-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              className="rounded-lg bg-[#21295A] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#161c42] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="button"
              onClick={handleGenerate}
            >
              {isSubmitting ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3">
          <button
            className="w-full rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-500 hover:bg-gray-50"
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

export default GenerateCoachSlotsModal;
