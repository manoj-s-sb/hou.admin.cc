import { useState } from 'react';

import { TailgateLog, TailgateStatus } from '../../../store/tailgate/types';

interface ReviewModalProps {
  log: TailgateLog;
  onClose: () => void;
  onSave: (id: string, status: TailgateStatus, notes: string) => void;
}

const ReviewModal = ({ log, onClose, onSave }: ReviewModalProps) => {
  const [status, setStatus] = useState<TailgateStatus>(log.status === 'pending' ? 'reviewed' : log.status);
  const [notes, setNotes]   = useState(log.notes || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[14px] font-bold text-[#21295A]">
              {log.status === 'pending' ? 'Write Review' : 'Edit Review'}
            </p>
            <p className="text-[11px] text-gray-400">{log.date} · {log.t} · {log.gate}</p>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Set Status</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
                  status === 'reviewed' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
                type="button"
                onClick={() => setStatus('reviewed')}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${status === 'reviewed' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {status === 'reviewed' && <span className="text-[10px] font-bold text-white">✓</span>}
                </div>
                <p className="mt-1 text-[12px] font-bold text-gray-700">Reviewed</p>
                <p className="text-[10px] text-gray-400">No issue found</p>
              </button>
              <button
                className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
                  status === 'violation' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
                type="button"
                onClick={() => setStatus('violation')}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${status === 'violation' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                  {status === 'violation' && <span className="text-[10px] font-bold text-white">!</span>}
                </div>
                <p className="mt-1 text-[12px] font-bold text-gray-700">Violation</p>
                <p className="text-[10px] text-gray-400">Flag this member</p>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="rv-notes">
              Review Notes
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
              id="rv-notes"
              placeholder="Add notes about this entry…"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition ${
                status === 'violation' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#21295A] hover:bg-[#1a2147]'
              }`}
              type="button"
              onClick={() => { onSave(log.id, status, notes); onClose(); }}
            >
              Save Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
