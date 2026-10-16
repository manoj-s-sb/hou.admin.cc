import { useEffect, useMemo, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import {
  DayOfWeek,
  EditScope,
  EditSeriesResponse,
  RecurrenceType,
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

/** The combined "Ends" dropdown's current value — mirrors NewSeriesModal's
 * own helper of the same name/purpose. "specific_dates" carries no endType
 * suffix (there's no pattern to end, just a hand-picked date list). */
const endsOptionValue = (recurrenceType: RecurrenceType, endType: SeriesEndType | null): string =>
  recurrenceType === 'specific_dates' ? 'specific_dates' : `weekly_${endType}`;

const parseEndsOption = (value: string): { recurrenceType: RecurrenceType; endType: SeriesEndType | null } => {
  if (value === 'specific_dates') return { recurrenceType: 'specific_dates', endType: null };
  const sep = value.indexOf('_');
  return { recurrenceType: value.slice(0, sep) as RecurrenceType, endType: value.slice(sep + 1) as SeriesEndType };
};

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
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(['sunday']);
  // Only meaningful when recurrenceType === 'monthly' — a full date (its
  // day-of-month is what actually gets sent, as monthlyEndDay) within the
  // same month as effectiveStartDate, marking the recurring range's last day.
  const [monthlyThroughDate, setMonthlyThroughDate] = useState('');
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [pendingDate, setPendingDate] = useState('');
  const [startTimeLocal, setStartTimeLocal] = useState('09:00');
  const [endTimeLocal, setEndTimeLocal] = useState('09:45');
  const [endType, setEndType] = useState<SeriesEndType | null>('after_count');
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
        setRecurrenceType(s.recurrenceType);
        setDaysOfWeek(s.daysOfWeek);
        if (s.recurrenceType === 'monthly') {
          const sd = new Date(`${s.startDate}T00:00:00`);
          const throughDay = s.monthlyEndDay ?? sd.getDate();
          sd.setDate(throughDay);
          setMonthlyThroughDate(sd.toISOString().slice(0, 10));
        } else {
          setMonthlyThroughDate(s.startDate);
        }
        setSpecificDates(s.specificDates || []);
        setPendingDate('');
        setStartTimeLocal(s.startTimeLocal);
        setEndTimeLocal(s.endTimeLocal);
        setEndType(s.endType ?? null);
        setEndDate(s.endDate || '');
        setOccurrenceCount(s.occurrenceCount || 12);
        setReason(s.reason);
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load the series.'))
      .finally(() => setLoading(false));
  }, [isOpen, seriesId]);

  if (!isOpen) return null;

  // The lower bound for picking specific dates — this modal has no editable
  // "Starting from" field (unlike NewSeriesModal): for 'this_and_following'
  // the new series always starts at the clicked occurrence; for 'all' the
  // series' own existing startDate is left untouched.
  const effectiveStartDate = scope === 'this_and_following' ? occurrenceDate : series?.startDate || '';

  const addSpecificDate = () => {
    if (!pendingDate) return;
    if (effectiveStartDate && pendingDate < effectiveStartDate) return;
    if (endDate && pendingDate > endDate) return;
    setSpecificDates(prev => (prev.includes(pendingDate) ? prev : [...prev, pendingDate].sort()));
    setPendingDate('');
  };

  const removeSpecificDate = (d: string) => {
    setSpecificDates(prev => prev.filter(x => x !== d));
  };

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
        payload.recurrenceType = recurrenceType;
        payload.daysOfWeek = recurrenceType === 'weekly' ? daysOfWeek : [];
        payload.monthlyEndDay =
          recurrenceType === 'monthly'
            ? Number((endType === 'on_date' ? endDate : monthlyThroughDate).split('-')[2])
            : undefined;
        payload.specificDates = recurrenceType === 'specific_dates' ? specificDates : [];
        payload.startTimeLocal = startTimeLocal;
        payload.endTimeLocal = endTimeLocal;
        payload.timezone = series.timezone;
        payload.endType = recurrenceType === 'specific_dates' ? undefined : endType;
        if (recurrenceType === 'specific_dates' || endType === 'on_date') payload.endDate = endDate;
        if (recurrenceType !== 'specific_dates' && endType === 'after_count') payload.occurrenceCount = occurrenceCount;
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

  const monthlyRangeValid =
    recurrenceType !== 'monthly' ||
    (endType === 'on_date'
      ? !!endDate && (!effectiveStartDate || Number(endDate.split('-')[2]) >= Number(effectiveStartDate.split('-')[2]))
      : !!monthlyThroughDate &&
        (!effectiveStartDate || monthlyThroughDate >= effectiveStartDate) &&
        monthlyThroughDate.slice(0, 7) === effectiveStartDate.slice(0, 7));

  const formValid =
    !!reason.trim() &&
    (scope === 'this_one' ||
      (startTimeLocal < endTimeLocal &&
        monthlyRangeValid &&
        (recurrenceType === 'specific_dates'
          ? !!endDate && (!effectiveStartDate || effectiveStartDate <= endDate) && specificDates.length > 0
          : (recurrenceType !== 'weekly' || daysOfWeek.length > 0) &&
            (endType !== 'on_date' || !!endDate) &&
            (endType !== 'after_count' || occurrenceCount >= 1))));

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
                    <label className={labelCls} htmlFor="es-end-type">
                      Ends
                    </label>
                    <select
                      className={inputCls}
                      id="es-end-type"
                      value={endsOptionValue(recurrenceType, endType)}
                      onChange={e => {
                        const { recurrenceType: rt, endType: et } = parseEndsOption(e.target.value);
                        setRecurrenceType(rt);
                        setEndType(et);
                      }}
                    >
                      <option value="weekly_after_count">Weekly — After a number of occurrences</option>
                      <option value="weekly_on_date">Weekly — On a specific date</option>
                      <option value="weekly_never">Weekly — Never</option>
                      <option value="monthly_after_count">Monthly — After a number of occurrences</option>
                      <option value="monthly_on_date">Monthly — On a specific date</option>
                      <option value="monthly_never">Monthly — Never</option>
                      <option value="specific_dates">Specific dates</option>
                    </select>
                  </div>

                  {recurrenceType === 'weekly' && (
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
                      <p className="mt-1.5 text-[12px] text-gray-500">
                        This series repeats on every checked day each week, until the end condition you choose above.
                      </p>
                    </div>
                  )}

                  {recurrenceType === 'monthly' && endType !== 'on_date' && (
                    <div>
                      <label className={labelCls} htmlFor="es-monthly-through">
                        End date
                      </label>
                      <input
                        className={inputCls}
                        id="es-monthly-through"
                        min={effectiveStartDate || undefined}
                        type="date"
                        value={monthlyThroughDate}
                        onChange={e => setMonthlyThroughDate(e.target.value)}
                      />
                      {!monthlyRangeValid && (
                        <p className="mt-1 text-[12px] text-red-500">
                          End date must be on or after the start date, in the same month.
                        </p>
                      )}
                    </div>
                  )}

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

                  {recurrenceType !== 'specific_dates' && endType === 'after_count' && (
                    <div>
                      <label className={labelCls} htmlFor="es-count">
                        {recurrenceType === 'weekly' ? 'Number of weeks' : 'Number of months'}
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
                  {(recurrenceType === 'specific_dates' || endType === 'on_date') && (
                    <div>
                      <label className={labelCls} htmlFor="es-end-date">
                        End date
                      </label>
                      <input
                        className={inputCls}
                        id="es-end-date"
                        min={effectiveStartDate || undefined}
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                      {recurrenceType === 'specific_dates' &&
                        !!effectiveStartDate &&
                        !!endDate &&
                        effectiveStartDate > endDate && (
                          <p className="mt-1 text-[12px] text-red-500">End date must be on or after the start date.</p>
                        )}
                      {recurrenceType === 'monthly' && !monthlyRangeValid && (
                        <p className="mt-1 text-[12px] text-red-500">
                          End date&apos;s day-of-month must be on or after the start date&apos;s day-of-month (its day
                          becomes the range&apos;s last day).
                        </p>
                      )}
                    </div>
                  )}

                  {recurrenceType === 'specific_dates' && (
                    <div>
                      <span className={labelCls}>Dates</span>
                      <div className="flex items-center gap-2">
                        <input
                          className={inputCls}
                          max={endDate || undefined}
                          min={effectiveStartDate || undefined}
                          type="date"
                          value={pendingDate}
                          onChange={e => setPendingDate(e.target.value)}
                        />
                        <button
                          className="shrink-0 rounded-xl border-2 border-[#B3DADA] px-4 py-2.5 text-[13px] font-medium text-[#21295A] hover:border-[#21295A] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!pendingDate}
                          type="button"
                          onClick={addSpecificDate}
                        >
                          Add date
                        </button>
                      </div>
                      {specificDates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {specificDates.map(d => (
                            <span
                              key={d}
                              className="flex items-center gap-1.5 rounded-full border border-[#B3DADA] bg-[#F8FAFA] px-3 py-1 text-[12px] font-medium text-[#21295A]"
                            >
                              {d}
                              <button
                                aria-label={`Remove ${d}`}
                                className="text-gray-400 hover:text-red-500"
                                type="button"
                                onClick={() => removeSpecificDate(d)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {specificDates.length === 0 && (
                        <p className="mt-1 text-[12px] text-red-500">Add at least one date.</p>
                      )}
                      <p className="mt-1.5 text-[12px] text-gray-500">
                        This series blocks exactly the dates added above — nothing is generated automatically and no
                        pattern repeats.
                      </p>
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
