import { useEffect, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import { getLocalUser } from '../../../constants/user';
import { Lanes } from '../../../store/slots/types';
import { formatSlotTime } from '../utils/timeFormat';

const BLOCK_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'Scheduled Maintenance', label: 'Scheduled Maintenance' },
  { value: 'Out of service', label: 'Out of service' },
  { value: 'For Demo', label: 'For Demo' },
  { value: 'Other', label: 'Other' },
];

interface LaneDetailsModalProps {
  lane: Lanes;
  isOpen: boolean;
  onClose: () => void;
  onLaneClick: (reason?: string, blockLaneApp?: boolean, blockedByName?: string) => void;
  onCancelBooking: (slotCode: string, reason: string) => void;
  isLoading?: boolean;
}

const formatLaneType = (type?: string) => (type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` : '');

const getBookedName = (slot: Lanes['slots'][number]): string => {
  const firstName = slot.booking?.user?.firstName?.trim();
  const lastName = slot.booking?.user?.lastName?.trim();
  return [firstName, lastName].filter(Boolean).join(' ') || 'Booking details unavailable';
};

const LaneDetailsModal = ({
  lane,
  isOpen,
  onClose,
  onLaneClick,
  onCancelBooking,
  isLoading = false,
}: LaneDetailsModalProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [blockLaneApp] = useState(false);
  // One shared reason for cancelling bookings in this lane — with several bookings
  // possibly needing to be cleared to block the whole lane, typing a separate reason
  // for each one isn't practical, so a single reason applies to all of them.
  const [cancelReason, setCancelReason] = useState('');
  // Pre-filled from the logged-in user, but editable — e.g. for a shared/generic
  // login used by different physical staff. Resets each time the modal opens.
  const [blockedByName, setBlockedByName] = useState('');

  useEffect(() => {
    if (isOpen) setBlockedByName(getLocalUser().name);
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if any slot is disabled (blocked)
  const isLaneBlocked = lane.slots.some(slot => slot.status?.toLowerCase() === 'disabled');
  const buttonText = isLaneBlocked ? 'Unblock Lane' : 'Block Lane';
  const bookedSlots = lane.slots.filter(slot => slot.isBooked && slot.status?.toLowerCase() === 'confirmed');
  // Slots are blocked in one batch sharing the same reason/blockedByName — the first
  // disabled slot's audit fields represent the whole lane's block.
  const disabledSlot = lane.slots.find(slot => slot.status?.toLowerCase() === 'disabled');

  const handleCancelOne = (slotCode: string) => {
    if (!window.confirm('Cancel this booking? This frees up the slot immediately.')) return;
    onCancelBooking(slotCode, cancelReason.trim());
  };

  const handleCancelAll = () => {
    if (
      !window.confirm(`Cancel all ${bookedSlots.length} bookings in this lane? This frees up every slot immediately.`)
    )
      return;
    bookedSlots.forEach(slot => onCancelBooking(slot.slotCode, cancelReason.trim()));
  };

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
      <div
        className="w-full max-w-[95%] overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-lg md:max-w-xl"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <h2 className="text-[18px] font-semibold text-[#21295A]">Lane {lane.laneNo}</h2>
          <button
            className="rounded-full p-1 text-[#21295A] transition-all hover:bg-white hover:shadow-md"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="mb-5">
            <h3 className="mb-4 text-[15px] font-semibold text-[#21295A]">Lane Details</h3>
            <div className="space-y-3 rounded-xl border border-[#E5F0F0] bg-gradient-to-br from-[#F8FAFA] to-[#FFFFFF] p-5 shadow-sm">
              <div className="flex justify-between">
                <span className="text-[14px] text-gray-600">Lane Number:</span>
                <span className="text-[14px] font-medium text-[#21295A]">{lane.laneNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px] text-gray-600">Lane Type:</span>
                <span className="text-[14px] font-medium text-[#21295A]">{formatLaneType(lane.laneType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px] text-gray-600">Status:</span>
                <span
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold ${isLaneBlocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                >
                  {isLaneBlocked ? 'Blocked' : 'Available'}
                </span>
              </div>

              {/* Disabled Details - Show if lane is blocked */}
              {isLaneBlocked &&
                disabledSlot &&
                (disabledSlot.disableReason || disabledSlot.disabledAt || disabledSlot.disabledByName) && (
                  <div className="mt-2 border-t border-red-100 pt-3">
                    <div className="mb-2">
                      <span className="text-[14px] font-semibold text-red-600">Disabled Info</span>
                    </div>
                    <div className="space-y-2 rounded-lg bg-red-50 p-3">
                      {disabledSlot.disableReason && (
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <span className="text-[13px] text-gray-600">Reason:</span>
                          <span className="max-w-[300px] break-words text-right text-[13px] font-medium text-red-600">
                            {disabledSlot.disableReason}
                          </span>
                        </div>
                      )}
                      {disabledSlot.disabledAt && (
                        <div className="flex justify-between">
                          <span className="text-[13px] text-gray-600">Disabled At:</span>
                          <span className="text-[13px] font-medium text-red-600">
                            {new Date(disabledSlot.disabledAt).toLocaleString('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      )}
                      {disabledSlot.disabledByName && (
                        <div className="flex justify-between">
                          <span className="text-[13px] text-gray-600">Blocked By:</span>
                          <span className="text-[13px] font-medium text-red-600">{disabledSlot.disabledByName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Existing bookings in this lane — blocking the lane doesn't touch these,
              so surface them here with a Cancel option in case the admin needs to
              clear the lane before blocking it. One shared reason applies to whichever
              of these get cancelled, rather than typing it out for each booking. */}
          {!isLaneBlocked && bookedSlots.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-3 text-[15px] font-semibold text-[#21295A]">
                Bookings in this lane <span className="font-normal text-gray-400">({bookedSlots.length})</span>
              </h3>
              <div className="mb-3 space-y-2">
                {bookedSlots.map(slot => (
                  <div
                    key={slot.slotCode}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E5F0F0] bg-gradient-to-br from-[#F8FAFA] to-[#FFFFFF] p-3.5 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#21295A]">
                        {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                      </div>
                      <div className="truncate text-[12px] text-gray-500">{getBookedName(slot)}</div>
                    </div>
                    <button
                      className="flex-none rounded-lg border-2 border-red-200 px-3 py-1.5 text-[12.5px] font-medium text-red-600 transition-all hover:bg-red-50"
                      type="button"
                      onClick={() => handleCancelOne(slot.slotCode)}
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-600" htmlFor="lane-cancel-reason">
                  Cancellation Reason{' '}
                  <span className="font-normal text-gray-400">(optional — applies to any booking cancelled above)</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                  id="lane-cancel-reason"
                  maxLength={500}
                  placeholder="e.g. Facility maintenance — applies to all bookings cancelled in this lane"
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                />
              </div>
              {bookedSlots.length > 1 && (
                <button
                  className="mt-3 w-full rounded-xl border-2 border-red-200 px-4 py-2.5 text-[13px] font-medium text-red-600 transition-all hover:bg-red-50"
                  type="button"
                  onClick={handleCancelAll}
                >
                  Cancel All {bookedSlots.length} Bookings
                </button>
              )}
            </div>
          )}

          {/* Block Reason Selection - Only show when lane is not blocked */}
          {!isLaneBlocked && (
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
                  {BLOCK_REASONS.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {selectedReason && (
                  <>
                    <textarea
                      className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                      maxLength={500}
                      placeholder={`Enter details for ${selectedReason} (max 500 characters)...`}
                      rows={4}
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                    />
                    <div className="flex justify-between text-[12px]">
                      <span className={customReason.length >= 500 ? 'text-red-500' : 'text-gray-500'}>
                        {customReason.length}/500 characters
                      </span>
                      {customReason.length >= 500 && (
                        <span className="text-red-500">Maximum 500 characters allowed</span>
                      )}
                    </div>
                    <div>
                      <label
                        className="mb-1 block text-[13px] font-medium text-gray-600"
                        htmlFor="lane-blocked-by-name"
                      >
                        Blocked By
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                        id="lane-blocked-by-name"
                        placeholder="Your name"
                        // Pre-filled from your login — edit this if you're blocking on
                        // behalf of someone else using a shared login.
                        type="text"
                        value={blockedByName}
                        onChange={e => setBlockedByName(e.target.value)}
                      />
                    </div>
                  </>
                )}
                {/* Block Lane App Checkbox */}
                {/* <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5F0F0] bg-gradient-to-br from-[#F8FAFA] to-[#FFFFFF] p-4 transition-all hover:border-[#B3DADA]">
                  <input
                    checked={blockLaneApp}
                    className="h-5 w-5 cursor-pointer rounded border-[#B3DADA] text-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                    type="checkbox"
                    onChange={e => setBlockLaneApp(e.target.checked)}
                  />
                  <span className="text-[14px] font-medium text-[#21295A]">Block this lane on the app</span>
                </label> */}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] hover:shadow-xl hover:shadow-[#21295A]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              disabled={isLoading || (!isLaneBlocked && (!selectedReason || !customReason.trim()))}
              onClick={() => {
                if (isLaneBlocked) {
                  onLaneClick();
                } else {
                  const reason = `${selectedReason}: ${customReason.trim()}`;
                  onLaneClick(reason, blockLaneApp, blockedByName.trim());
                }
              }}
            >
              {isLoading ? (
                <>
                  <LoaderSpinner className="text-white" size="sm" />
                  Processing...
                </>
              ) : (
                <>
                  {isLaneBlocked ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )}
                  {buttonText}
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

export default LaneDetailsModal;
