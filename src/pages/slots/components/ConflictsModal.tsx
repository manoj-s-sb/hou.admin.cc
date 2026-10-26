import { useEffect, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { ConflictItem } from '../../../store/recurringBlocks/types';
import { handleApiError } from '../../../utils/errorUtils';

const CONFLICT_BADGE: Record<string, { label: string; cls: string }> = {
  member: { label: 'Member booking', cls: 'bg-red-50 text-red-700 border-red-200' },
  coach: { label: 'Coach booking', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

interface ConflictsModalProps {
  isOpen: boolean;
  facilityCode: string;
  onClose: () => void;
  /** Called after a conflict is resolved so the calendar grid refreshes. */
  onChanged: () => void;
  /** Lets the caller keep its own badge count in sync without a second fetch. */
  onCountChanged: (count: number) => void;
}

const conflictKey = (item: ConflictItem) => `${item.seriesId}::${item.occurrenceDate}`;

const ConflictsModal = ({ isOpen, facilityCode, onClose, onChanged, onCountChanged }: ConflictsModalProps) => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resolutions, setResolutions] = useState<Record<string, { decision: 'keep' | 'cancel'; reason: string }>>({});
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const load = () => {
    setError('');
    setLoading(true);
    api
      .post(endpoints.recurringBlocks.conflictsList, { facilityCode })
      .then(res => {
        const list = (res.data?.data?.conflicts as ConflictItem[]) || [];
        setConflicts(list);
        onCountChanged(list.length);
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load conflicts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facilityCode]);

  if (!isOpen) return null;

  const handleResolve = async (item: ConflictItem) => {
    const key = conflictKey(item);
    const resolution = resolutions[key];
    if (!resolution || (resolution.decision === 'cancel' && !resolution.reason.trim())) return;

    setResolvingKey(key);
    setError('');
    try {
      await api.post(endpoints.recurringBlocks.conflictsResolve, {
        seriesId: item.seriesId,
        occurrenceDate: item.occurrenceDate,
        decision: resolution.decision,
        reason: resolution.decision === 'cancel' ? resolution.reason.trim() : undefined,
      });
      const remaining = conflicts.filter(c => conflictKey(c) !== key);
      setConflicts(remaining);
      onCountChanged(remaining.length);
      onChanged();
    } catch (e) {
      setError(handleApiError(e, 'Failed to resolve the conflict.'));
    } finally {
      setResolvingKey(null);
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
            <h2 className="text-[18px] font-semibold text-[#21295A]">Conflicts needing attention</h2>
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

          {!loading && conflicts.length === 0 && (
            <p className="py-10 text-center text-[13px] text-gray-400">
              Nothing needs attention right now — every active series&apos; upcoming dates are conflict-free.
            </p>
          )}

          {!loading && conflicts.length > 0 && (
            <div className="space-y-3">
              {conflicts.map(item => {
                const key = conflictKey(item);
                const badge = CONFLICT_BADGE[item.conflictType];
                const resolution = resolutions[key];
                const canResolve =
                  !!resolution &&
                  (resolution.decision === 'keep' || (resolution.decision === 'cancel' && resolution.reason.trim()));
                return (
                  <div key={key} className="rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[13px] font-semibold text-[#21295A]">{item.laneCode}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="text-[13px] text-gray-600">{item.occurrenceDate}</span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {item.booking && (
                      <p className="mt-0.5 text-[12px] text-gray-500">
                        {item.booking.memberName || '(unknown member)'} — {item.booking.bookingCode}
                      </p>
                    )}
                    <p className="mt-0.5 text-[12px] text-gray-400">Series reason: {item.reason}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                        value={resolution?.decision || ''}
                        onChange={e =>
                          setResolutions(prev => ({
                            ...prev,
                            [key]: {
                              decision: e.target.value as 'keep' | 'cancel',
                              reason: prev[key]?.reason || '',
                            },
                          }))
                        }
                      >
                        <option value="">Decide…</option>
                        <option value="keep">Keep booking, skip this date</option>
                        <option value="cancel">Cancel booking</option>
                      </select>
                      {resolution?.decision === 'cancel' && (
                        <input
                          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                          placeholder="Reason (required)"
                          value={resolution?.reason || ''}
                          onChange={e =>
                            setResolutions(prev => ({
                              ...prev,
                              [key]: { decision: 'cancel', reason: e.target.value },
                            }))
                          }
                        />
                      )}
                      <button
                        className="rounded-lg bg-[#21295A] px-3 py-1 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canResolve || resolvingKey === key}
                        type="button"
                        onClick={() => handleResolve(item)}
                      >
                        {resolvingKey === key ? 'Resolving…' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConflictsModal;
