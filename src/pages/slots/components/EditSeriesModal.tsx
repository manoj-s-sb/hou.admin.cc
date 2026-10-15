import { useEffect, useMemo, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import {
  DayOfWeek,
  EditScope,
  EditSeriesResponse,
  SeriesEndType,
  SeriesWithEtag,
} from '../../../store/recurringBlocks/types';

const inputCls =
  'w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-2.5 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10';
const labelCls = 'mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-gray-500';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

interface EditSeriesModalProps {
  isOpen: boolean;
  seriesId: string;
  /** The date whose cell the admin clicked — the occurrence an edit starts from. */
  occurrenceDate: string;
  /** The real slot grid's start times for the currently-viewed date — Start/End
   * time are restricted to these, same reason as NewSeriesModal's. */
  timeSlots: string[];
  onClose: () => void;
  onDone: () => void;
}

const EditSeriesModal = ({ isOpen, seriesId, occurrenceDate, timeSlots, onClose, onDone }: EditSeriesModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [series, setSeries] = useState<SeriesWithEtag | null>(null);
  const [scope, setScope] = useState<EditScope>('this_one');

  const [reason, setReason] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(['sunday']);
  const [startTimeLocal, setStartTimeLocal] = useState('09:00');
  const [endTimeLocal, setEndTimeLocal] = useState('09:45');
  const [endType, setEndType] = useState<SeriesEndType>('after_count');
  const [endDate, setEndDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(12);

  const [result, setResult] = useState<EditSeriesResponse | null>(null);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setResult(null);
    setScope('this_one');
    setReason('');
    setLoading(true);
    api
      .post(endpoints.recurringBlocks.getSeries, { seriesId })
      .then(res => {
        const s = res.data?.data?.series as SeriesWithEtag;
        setSeries(s);
        setDaysOfWeek(s.daysOfWeek);
        setStartTimeLocal(s.startTimeLocal);
        setEndTimeLocal(s.endTimeLocal);
        setEndType(s.endType);
        setEndDate(s.endDate || '');
        setOccurrenceCount(s.occurrenceCount || 12);
        setReason(s.reason);
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load the series.'))
      .finally(() => setLoading(false));
  }, [isOpen, seriesId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!series) return;
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { seriesId, scope, reason: reason.trim() };
      if (scope === 'this_one' || scope === 'this_and_following') {
        payload.occurrenceDate = occurrenceDate;
      }
      if (scope === 'this_and_following' || scope === 'all') {
        payload.expectedEtag = series.etag;
        payload.daysOfWeek = daysOfWeek;
        payload.startTimeLocal = startTimeLocal;
        payload.endTimeLocal = endTimeLocal;
        payload.timezone = series.timezone;
        payload.endType = endType;
        if (endType === 'on_date') payload.endDate = endDate;
        if (endType === 'after_count') payload.occurrenceCount = occurrenceCount;
      }
      if (scope === 'this_and_following') {
        payload.idempotencyKey = idempotencyKey;
      }

      const res = await api.post(endpoints.recurringBlocks.edit, payload);
      setResult(res.data?.data as EditSeriesResponse);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to edit the series.');
    } finally {
      setLoading(false);
    }
  };

  const formValid =
    !!reason.trim() &&
    (scope === 'this_one' ||
      (daysOfWeek.length > 0 &&
        startTimeLocal < endTimeLocal &&
        (endType !== 'on_date' || !!endDate) &&
        (endType !== 'after_count' || occurrenceCount >= 1)));

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
        className="max-h-[90vh] w-full max-w-[95%] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-lg"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#21295A]">Edit Recurring Block</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">Occurrence: {occurrenceDate}</p>
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

        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">{error}</div>
          )}

          {!result && series && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="es-scope">
                  Apply to
                </label>
                <select
                  className={inputCls}
                  id="es-scope"
                  value={scope}
                  onChange={e => setScope(e.target.value as EditScope)}
                >
                  <option value="this_one">This occurrence only ({occurrenceDate})</option>
                  <option value="this_and_following">This and following occurrences</option>
                  <option value="all">All occurrences (the whole series)</option>
                </select>
              </div>

              {scope === 'this_one' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  Only the reason for this one date can be changed here — the time/lane stays the same.
                </p>
              )}
              {scope === 'this_and_following' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  This ends the current series the occurrence before {occurrenceDate}, and starts a new series from{' '}
                  {occurrenceDate} with the settings below — re-running the same conflict checks as creating a series.
                </p>
              )}
              {scope === 'all' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  Updates the series definition going forward. Already-blocked dates are left exactly as they are —
                  skip/reblock any date that no longer matches separately.
                </p>
              )}

              {(scope === 'this_and_following' || scope === 'all') && (
                <>
                  <div>
                    <span className={labelCls}>Repeats on</span>
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#B3DADA] bg-white p-3 sm:grid-cols-4">
                      {DAYS.map(d => (
                        <label key={d.value} className="flex items-center gap-2 text-[13px] text-[#21295A]">
                          <input
                            checked={daysOfWeek.includes(d.value)}
                            type="checkbox"
                            onChange={() =>
                              setDaysOfWeek(prev =>
                                prev.includes(d.value) ? prev.filter(x => x !== d.value) : [...prev, d.value]
                              )
                            }
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>
                    {daysOfWeek.length === 0 && (
                      <p className="mt-1 text-[12px] text-red-500">Select at least one day.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="es-end-type">
                      Ends
                    </label>
                    <select
                      className={inputCls}
                      id="es-end-type"
                      value={endType}
                      onChange={e => setEndType(e.target.value as SeriesEndType)}
                    >
                      <option value="after_count">After a number of occurrences</option>
                      <option value="on_date">On a specific date</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="es-start-time">
                        Start time
                      </label>
                      <select
                        className={inputCls}
                        id="es-start-time"
                        value={startTimeLocal}
                        onChange={e => setStartTimeLocal(e.target.value)}
                      >
                        {/* The series' current value is always selectable even if it predates
                            the grid restriction (e.g. an old off-grid time) — otherwise it'd
                            render with no option selected until the admin picks a new one. */}
                        {(timeSlots.includes(startTimeLocal) ? timeSlots : [startTimeLocal, ...timeSlots]).map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="es-end-time">
                        End time
                      </label>
                      <select
                        className={inputCls}
                        id="es-end-time"
                        value={endTimeLocal}
                        onChange={e => setEndTimeLocal(e.target.value)}
                      >
                        {(timeSlots.includes(endTimeLocal) ? timeSlots : [endTimeLocal, ...timeSlots]).map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="-mt-2 text-[12px] text-gray-400">
                    Times are restricted to this centre&apos;s slot grid.
                  </p>
                  {startTimeLocal >= endTimeLocal && (
                    <p className="text-[12px] text-red-500">Start time must be before end time.</p>
                  )}
                  {endType === 'after_count' && (
                    <div>
                      <label className={labelCls} htmlFor="es-count">
                        Number of weeks
                      </label>
                      <input
                        className={inputCls}
                        id="es-count"
                        min={1}
                        type="number"
                        value={occurrenceCount}
                        onChange={e => setOccurrenceCount(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                  )}
                  {endType === 'on_date' && (
                    <div>
                      <label className={labelCls} htmlFor="es-end-date">
                        End date
                      </label>
                      <input
                        className={inputCls}
                        id="es-end-date"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className={labelCls} htmlFor="es-reason">
                  Reason
                </label>
                <textarea
                  className={inputCls}
                  id="es-reason"
                  maxLength={500}
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!formValid || loading}
                  type="button"
                  onClick={handleSubmit}
                >
                  {loading ? <LoaderSpinner className="text-white" size="sm" /> : 'Save changes'}
                </button>
                <button
                  className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] hover:bg-gray-50"
                  disabled={loading}
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!result && loading && !series && (
            <div className="flex justify-center py-8">
              <LoaderSpinner className="text-[#21295A]" size="md" />
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
                {scope === 'this_one' && 'Reason updated for this occurrence.'}
                {scope === 'all' && 'Series updated.'}
                {scope === 'this_and_following' && (
                  <>
                    Series split — the old series now ends {result.oldSeries.endDate}, and a new series starts{' '}
                    {result.newSeries?.startDate}.{' '}
                    {result.createResult &&
                      `${result.createResult.occurrences.filter(o => o.outcome !== 'not_yet_created').length} date(s) processed.`}
                  </>
                )}
              </div>
              {result.createResult && result.createResult.unresolvedConflicts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                  {result.createResult.unresolvedConflicts.length} date(s) need a coach-conflict decision and were left
                  untouched: {result.createResult.unresolvedConflicts.join(', ')}
                </div>
              )}
              <button
                className="w-full rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white"
                type="button"
                onClick={() => {
                  onDone();
                  onClose();
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditSeriesModal;
