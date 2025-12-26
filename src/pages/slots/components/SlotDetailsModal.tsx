import moment from 'moment';

import { Slot } from '../../../store/slots/types';

interface SlotDetailsModalProps {
  slot: Slot | null;
  laneNo: number;
  isOpen: boolean;
  onClose: () => void;
  onBlockSlot: () => void;
  onUnblockSlot: () => void;
  isLoading?: boolean;
  isStanceBeamAdmin?: boolean;
}

const SlotDetailsModal = ({
  slot,
  laneNo,
  isOpen,
  onClose,
  onBlockSlot,
  onUnblockSlot,
  isLoading = false,
  isStanceBeamAdmin = false,
}: SlotDetailsModalProps) => {
  if (!isOpen || !slot) return null;

  const isAvailable = slot.status?.toLowerCase() === 'available';
  const isBlocked = !slot.isBooked && slot.status?.toLowerCase() === 'disabled';
  const isBooked = slot.isBooked && slot.status?.toLowerCase() === 'confirmed';

  const getStatusBadge = () => {
    if (isBooked) return { text: 'Booked', class: 'bg-green-50 text-green-600' };
    if (isBlocked) return { text: 'Blocked', class: 'bg-red-50 text-red-600' };
    return { text: 'Available', class: 'bg-blue-50 text-blue-600' };
  };

  const statusBadge = getStatusBadge();

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
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <h2 className="text-[18px] font-semibold text-[#21295A]">Slot Details - Lane {laneNo}</h2>
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
        <div className="px-6 py-6">
          {/* Slot Details */}
          <div className="mb-5">
            <h3 className="mb-4 text-[15px] font-semibold text-[#21295A]">Slot Details</h3>
            <div className="space-y-3 rounded-xl border border-[#E5F0F0] bg-gradient-to-br from-[#F8FAFA] to-[#FFFFFF] p-5 shadow-sm">
              <div className="flex justify-between">
                <span className="text-[14px] text-gray-600">Time:</span>
                <span className="text-[14px] font-medium text-[#21295A]">
                  {moment(slot.startTime).format('HH:mm')} - {moment(slot.endTime).format('HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[14px] text-gray-600">Status:</span>
                <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${statusBadge.class}`}>
                  {statusBadge.text}
                </span>
              </div>

              {/* Booking Details - Show if slot is booked */}
              {isBooked && slot.booking?.user && (
                <>
                  {slot.booking.user.firstName && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Name:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">
                        {slot.booking.user.firstName} {slot.booking.user.lastName || ''}
                      </span>
                    </div>
                  )}
                  {slot.booking.user.email && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Email:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">{slot.booking.user.email}</span>
                    </div>
                  )}
                  {slot.booking.user.phone && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Phone:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">{slot.booking.user.phone}</span>
                    </div>
                  )}
                  {slot?.booking?.facilityPin && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Facility Pin:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">{slot.booking.facilityPin}</span>
                    </div>
                  )}
                  {slot?.booking?.lanePin && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Lane Pin:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">{slot.booking.lanePin}</span>
                    </div>
                  )}
                  {slot?.booking?.coach?.name && (
                    <div className="flex justify-between">
                      <span className="text-[14px] text-gray-600">Coach:</span>
                      <span className="text-[14px] font-medium text-[#21295A]">{slot.booking.coach.name}</span>
                    </div>
                  )}
                  {slot?.booking?.guests && slot.booking.guests.length > 0 && (
                    <div className="mt-3 border-t border-[#E5F0F0] pt-3">
                      <div className="mb-2">
                        <span className="text-[14px] font-semibold text-[#F97316]">
                          Guest{slot.booking.guests.length > 1 ? 's' : ''} ({slot.booking.guests.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {slot.booking.guests.map((guest, index) => (
                          <div key={index} className="rounded-lg bg-orange-50 p-3">
                            <div className="flex justify-between">
                              <span className="text-[13px] text-gray-600">Name:</span>
                              <span className="text-[13px] font-medium text-[#21295A]">{guest.name}</span>
                            </div>
                            {guest.email && (
                              <div className="flex justify-between">
                                <span className="text-[13px] text-gray-600">Email:</span>
                                <span className="text-[13px] font-medium text-[#21295A]">{guest.email}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[13px] text-gray-600">Member:</span>
                              <span
                                className={`text-[13px] font-medium ${guest.isMember ? 'text-green-600' : 'text-gray-500'}`}
                              >
                                {guest.isMember ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons - Only show for StanceBeam admins */}
          <div className="flex justify-center gap-3">
            {isStanceBeamAdmin && isAvailable && (
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] hover:shadow-xl hover:shadow-[#21295A]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                disabled={isLoading}
                onClick={onBlockSlot}
              >
                {isLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    Processing...
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
                    Block Slot
                  </>
                )}
              </button>
            )}

            {isStanceBeamAdmin && isBlocked && (
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] hover:shadow-xl hover:shadow-[#21295A]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                disabled={isLoading}
                onClick={onUnblockSlot}
              >
                {isLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Unblock Slot
                  </>
                )}
              </button>
            )}

            <button
              className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] transition-all hover:scale-[1.02] hover:border-[#21295A] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              disabled={isLoading}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotDetailsModal;
