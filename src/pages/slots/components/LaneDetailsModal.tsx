import { Lanes } from '../../../store/slots/types';

interface LaneDetailsModalProps {
  lane: Lanes;
  isOpen: boolean;
  onClose: () => void;
  onLaneClick: () => void;
  isLoading?: boolean;
}

const formatLaneType = (type?: string) => (type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` : '');

const LaneDetailsModal = ({ lane, isOpen, onClose, onLaneClick, isLoading = false }: LaneDetailsModalProps) => {
  if (!isOpen) return null;

  // Check if all slots are disabled (blocked)
  const isLaneBlocked = lane.slots.every(slot => slot.status?.toLowerCase() === 'disabled');
  const buttonText = isLaneBlocked ? 'Unblock Lane' : 'Block Lane';

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
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
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
        <div className="px-6 py-6">
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
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] hover:shadow-xl hover:shadow-[#21295A]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              disabled={isLoading}
              onClick={onLaneClick}
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
