import { useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';

const BLOCK_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'Scheduled Maintenance', label: 'Scheduled Maintenance' },
  { value: 'Out of service', label: 'Out of service' },
  { value: 'For Demo', label: 'For Demo' },
  { value: 'Other', label: 'Other' },
];

interface BlockTimeSlotModalProps {
  isOpen: boolean;
  startTime: string;
  date: string;
  laneCount: number;
  isBlocked: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

const BlockTimeSlotModal = ({
  isOpen,
  startTime,
  date,
  laneCount,
  isBlocked,
  isLoading = false,
  onClose,
  onConfirm,
}: BlockTimeSlotModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isBlocked) {
      onConfirm();
    } else {
      const reason = customReason.trim() ? `${selectedReason}: ${customReason.trim()}` : selectedReason;
      onConfirm(reason);
    }
  };

  const isConfirmDisabled = isLoading || (!isBlocked && (!selectedReason || !customReason.trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-[95%] overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-lg" role="dialog">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#21295A]">
              {isBlocked ? 'Unblock Time Slot' : 'Block Time Slot'}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-500">Affects all lanes for this time</p>
          </div>
          <button
            className="rounded-full p-1 text-[#21295A] transition-all hover:bg-white hover:shadow-md"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Time Slot Info */}
          <div className="mb-5 space-y-3 rounded-xl border border-[#E5F0F0] bg-gradient-to-br from-[#F8FAFA] to-[#FFFFFF] p-5 shadow-sm">
            <div className="flex justify-between">
              <span className="text-[14px] text-gray-600">Start Time:</span>
              <span className="text-[14px] font-semibold text-[#21295A]">{startTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-gray-600">Date:</span>
              <span className="text-[14px] font-semibold text-[#21295A]">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-gray-600">Lanes Affected:</span>
              <span className="text-[14px] font-semibold text-[#21295A]">All {laneCount} lanes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[14px] text-gray-600">Status:</span>
              <span
                className={`rounded-full px-3 py-0.5 text-[13px] font-semibold ${
                  isBlocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}
              >
                {isBlocked ? 'Blocked' : 'Available'}
              </span>
            </div>
          </div>

          {/* Warning banner */}
          <div
            className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 ${
              isBlocked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <p className="text-[13px] font-medium">
              {isBlocked
                ? `This will re-enable the ${startTime} slot across all ${laneCount} lanes. Members will be able to book again.`
                : `This will block the ${startTime} slot across all ${laneCount} lanes. No bookings will be accepted for this time.`}
            </p>
          </div>

          {/* Reason — only when blocking */}
          {!isBlocked && (
            <div className="mb-5">
              <h3 className="mb-3 text-[15px] font-semibold text-[#21295A]">Block Reason</h3>
              <div className="space-y-3">
                <select
                  className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                  value={selectedReason}
                  onChange={e => {
                    setSelectedReason(e.target.value);
                    setCustomReason('');
                  }}
                >
                  {BLOCK_REASONS.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {selectedReason && (
                  <>
                    <textarea
                      className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                      maxLength={500}
                      placeholder={`e.g. "Pitch inspection at ${startTime}"…`}
                      rows={3}
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                    />
                    <p
                      className={`text-right text-[12px] ${customReason.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}
                    >
                      {customReason.length}/500
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 ${
                isBlocked
                  ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
                  : 'bg-[#21295A] shadow-[#21295A]/20 hover:bg-[#2d3570]'
              }`}
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
            >
              {isLoading ? (
                <>
                  <LoaderSpinner className="text-white" size="sm" />
                  Processing…
                </>
              ) : isBlocked ? (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Unblock All Lanes
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Block All Lanes
                </>
              )}
            </button>
            <button
              className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] transition-all hover:scale-[1.02] hover:border-[#21295A] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              disabled={isLoading}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockTimeSlotModal;
