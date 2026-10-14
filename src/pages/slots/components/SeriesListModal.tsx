import { useEffect, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { SeriesListItem } from '../../../store/recurringBlocks/types';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface SeriesListModalProps {
  isOpen: boolean;
  facilityCode: string;
  onClose: () => void;
  /** Called after an "Unblock all remaining" so the calendar grid refreshes. */
  onChanged: () => void;
}

const SeriesListModal = ({ isOpen, facilityCode, onClose, onChanged }: SeriesListModalProps) => {
  const [items, setItems] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = () => {
    setError('');
    setLoading(true);
    api
      .post(endpoints.recurringBlocks.list, { facilityCode })
      .then(res => setItems((res.data?.data?.series as SeriesListItem[]) || []))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load series.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facilityCode]);

  if (!isOpen) return null;

  const handleUnblockAll = async (item: SeriesListItem) => {
    if (
      !window.confirm(
        `Free all ${item.remainingBlockedCount} currently-blocked date(s) for this series? The series itself keeps running — use Cancel series separately to stop future blocking.`
      )
    ) {
      return;
    }
    setUnblockingId(item.series.id);
    try {
      await api.post(endpoints.recurringBlocks.unblockAll, { seriesId: item.series.id });
      onChanged();
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to unblock the remaining dates.');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-[95%] overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-3xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#21295A]">Recurring Series</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">{facilityCode}</p>
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

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{error}</div>
          )}

          {loading && (
            <div className="flex justify-center py-10">
              <LoaderSpinner className="text-[#21295A]" size="md" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="py-10 text-center text-[13px] text-gray-400">No recurring series for this centre yet.</p>
          )}

          {!loading && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-3">Lane</th>
                    <th className="py-2 pr-3">Schedule</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2 pr-3">Remaining blocked</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.series.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-3 pr-3 font-medium text-[#21295A]">{item.series.laneCode}</td>
                      <td className="py-3 pr-3 text-gray-600">
                        {item.series.dayOfWeek.charAt(0).toUpperCase() + item.series.dayOfWeek.slice(1)}{' '}
                        {item.series.startTimeLocal}–{item.series.endTimeLocal}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[item.series.status]}`}
                        >
                          {item.series.status}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate py-3 pr-3 text-gray-600" title={item.series.reason}>
                        {item.series.reason}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{item.remainingBlockedCount}</td>
                      <td className="py-3 pr-3">
                        <button
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={item.remainingBlockedCount === 0 || unblockingId === item.series.id}
                          type="button"
                          onClick={() => handleUnblockAll(item)}
                        >
                          {unblockingId === item.series.id ? 'Unblocking…' : 'Unblock all remaining'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesListModal;
