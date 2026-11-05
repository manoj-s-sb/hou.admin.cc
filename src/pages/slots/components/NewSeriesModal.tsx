import { useEffect, useMemo, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import {
  ConflictResolution,
  CreateSeriesResponse,
  DayOfWeek,
  OccurrencePreview,
  RecurrenceType,
  SeriesEndType,
  SeriesPreviewResponse,
} from '../../../store/recurringBlocks/types';
import { Lanes } from '../../../store/slots/types';
import { handleApiError } from '../../../utils/errorUtils';

const inputCls =
  'w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-2.5 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10';
const labelCls = 'mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-gray-500';
/** Appended to a label's text for every field `formValid` actually requires,
 * so the admin can tell at a glance what's mandatory vs. optional (e.g.
 * "Number of weeks" only appears — and is only required — for certain
 * recurrence types). */
const Required = () => <span className="text-red-500">&nbsp;*</span>;

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

const DEFAULT_OCCURRENCE_COUNT = 12;

/** Today's date, local, YYYY-MM-DD — the earliest a new series may start.
 * The backend rejects a past startDate outright; this just keeps the admin
 * from hitting that error after filling out the whole form. */
const todayStr = () => new Date().toISOString().slice(0, 10);

const CONFLICT_BADGE: Record<string, { label: string; cls: string }> = {
  none: { label: 'Will be reserved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  member: { label: 'Booked — conflict', cls: 'bg-red-50 text-red-700 border-red-200' },
  coach: { label: 'Booked — conflict', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  already_blocked: { label: 'Already blocked', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  // The lane's slot timings don't reach this far out yet — NOT abandoned: the
  // background extension job auto-reserves it the first run after the slot
  // opens, no admin action needed (see totalNotYetCreated's comment below).
  not_yet_created: { label: 'Slot not open yet', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const dayNameFromDate = (dateStr: string): DayOfWeek => {
  const d = new Date(`${dateStr}T00:00:00`);
  return DAYS[d.getDay()].value;
};

/** The combined "Ends" dropdown's current value: "weekly_after_count" /
 * "monthly_on_date" / etc. for an auto-repeating pattern, or the single
 * literal "specific_dates" (no end-type suffix — there's no pattern to
 * end, just a hand-picked date list). */
const endsOptionValue = (recurrenceType: RecurrenceType, endType: SeriesEndType | null): string =>
  recurrenceType === 'specific_dates' ? 'specific_dates' : `${recurrenceType}_${endType}`;

/** Inverse of `endsOptionValue` — split on the FIRST underscore only, since
 * `endType` values ("after_count", "on_date") carry underscores of their
 * own; "weekly"/"monthly" never do, so the first underscore is always
 * exactly the boundary between the two parts. */
const parseEndsOption = (value: string): { recurrenceType: RecurrenceType; endType: SeriesEndType | null } => {
  if (value === 'specific_dates') return { recurrenceType: 'specific_dates', endType: null };
  const sep = value.indexOf('_');
  return { recurrenceType: value.slice(0, sep) as RecurrenceType, endType: value.slice(sep + 1) as SeriesEndType };
};

/** Conflict-resolution map key — per lane AND date, since the same date can
 * be a conflict (member or coach) on one lane and free on another. */
const resolutionKey = (laneCode: string, occurrenceDate: string) => `${laneCode}::${occurrenceDate}`;

interface NewSeriesModalProps {
  isOpen: boolean;
  facilityCode: string;
  /** IANA timezone this page already assumes for its own date math (see the
   * page-level TIMEZONE constant) — reused here rather than a separate live
   * per-centre lookup, matching how this page already treats timezone. */
  timezone: string;
  lanes: Lanes[];
  /** The real slot grid's start times for the currently-viewed date (e.g.
   * "00:00","00:45","01:30",...) — Start/End time are restricted to these so
   * a series can never be defined at an off-grid time (e.g. "09:23") that no
   * slot will ever actually start at, which would silently block nothing
   * forever. */
  timeSlots: string[];
  initialDate?: string; // YYYY-MM-DD — prefills startDate + daysOfWeek
  onClose: () => void;
  onCreated: () => void;
}

type Step = 'form' | 'preview' | 'result';

/** The grid slot immediately after `time`, or the last grid slot if `time`
 * is already the last one — a sane one-slot-long default End time. */
const nextGridTime = (grid: string[], time: string): string => {
  const idx = grid.indexOf(time);
  if (idx === -1 || idx === grid.length - 1) return grid[grid.length - 1] || time;
  return grid[idx + 1];
};

const NewSeriesModal = ({
  isOpen,
  facilityCode,
  timezone,
  lanes,
  timeSlots,
  initialDate,
  onClose,
  onCreated,
}: NewSeriesModalProps) => {
  const [step, setStep] = useState<Step>('form');
  const [laneCodes, setLaneCodes] = useState<string[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(['sunday']);
  // Only meaningful when recurrenceType === 'monthly' — a full date (not just
  // a day number) so it can be picked with a normal calendar input; only its
  // day-of-month actually gets sent (as monthlyEndDay), paired with
  // startDate's own day as the recurring range's [start, end] bounds.
  const [monthlyThroughDate, setMonthlyThroughDate] = useState(todayStr());
  // Only meaningful when recurrenceType === 'specific_dates' — an explicit,
  // admin-picked list of dates, deduped and kept sorted ascending.
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [pendingDate, setPendingDate] = useState('');
  const defaultStart = timeSlots.includes('09:00') ? '09:00' : timeSlots[0] || '09:00';
  const [startTimeLocal, setStartTimeLocal] = useState(defaultStart);
  const [endTimeLocal, setEndTimeLocal] = useState(nextGridTime(timeSlots, defaultStart));
  const [startDate, setStartDate] = useState(todayStr());
  // null only when recurrenceType === 'specific_dates' — there's no pattern
  // to end, just a finite list of dates.
  const [endType, setEndType] = useState<SeriesEndType | null>('after_count');
  const [endDate, setEndDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(DEFAULT_OCCURRENCE_COUNT);
  const [reason, setReason] = useState('');

  // Keyed by laneCode — each selected lane gets its own preview, since the
  // same date can be free on one lane and booked on another.
  const [previews, setPreviews] = useState<Record<string, SeriesPreviewResponse>>({});
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, { decision: 'keep' | 'cancel'; reason: string }>
  >({});
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Keyed by laneCode — a lane whose create call failed has no entry here but
  // does have one in createErrors, so the result screen can report it rather
  // than silently drop it when one of several lanes fails.
  const [results, setResults] = useState<Record<string, CreateSeriesResponse>>({});
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Every field resets when the modal is reopened — it's never unmounted
  // between uses (the parent keeps it mounted and just toggles `isOpen`), so
  // without this a 2nd "New Series" click would silently show the FIRST
  // series' leftover result screen instead of a fresh form.
  useEffect(() => {
    if (!isOpen) return;
    setStep('form');
    setLaneCodes([]);
    setRecurrenceType('weekly');
    setDaysOfWeek([initialDate ? dayNameFromDate(initialDate) : 'sunday']);
    setMonthlyThroughDate(initialDate || todayStr());
    setSpecificDates([]);
    setPendingDate('');
    const resetStart = timeSlots.includes('09:00') ? '09:00' : timeSlots[0] || '09:00';
    setStartTimeLocal(resetStart);
    setEndTimeLocal(nextGridTime(timeSlots, resetStart));
    setStartDate(initialDate || todayStr());
    setEndType('after_count');
    setEndDate('');
    setOccurrenceCount(DEFAULT_OCCURRENCE_COUNT);
    setReason('');
    setPreviews({});
    setConflictResolutions({});
    setConfirmChecked(false);
    setError('');
    setResults({});
    setCreateErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // One base key per modal-open; each lane's actual idempotency key derives
  // from it, so retrying the SAME submit attempt (e.g. after a transient
  // network error) reuses the same key per lane — the backend dedupes on it,
  // so a double-click or retry can never create two series for one lane
  // (Locked Decision #14).
  const idempotencyBase = useMemo(() => crypto.randomUUID(), [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const toggleLane = (laneCode: string) => {
    setLaneCodes(prev => (prev.includes(laneCode) ? prev.filter(l => l !== laneCode) : [...prev, laneCode]));
  };

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  // Only meaningful for recurrenceType === 'specific_dates' — adds the
  // currently-picked date into the explicit list (deduped, kept sorted),
  // guarding against a date outside [startDate, endDate] in case a browser
  // lets one through despite the input's own min/max.
  const addSpecificDate = () => {
    if (!pendingDate) return;
    if (startDate && pendingDate < startDate) return;
    if (endDate && pendingDate > endDate) return;
    setSpecificDates(prev => (prev.includes(pendingDate) ? prev : [...prev, pendingDate].sort()));
    setPendingDate('');
  };

  const removeSpecificDate = (d: string) => {
    setSpecificDates(prev => prev.filter(x => x !== d));
  };

  const coreFieldsFor = (laneCode: string) => ({
    facilityCode,
    laneCode,
    recurrenceType,
    daysOfWeek: recurrenceType === 'weekly' ? daysOfWeek : [],
    monthlyEndDay:
      recurrenceType === 'monthly'
        ? Number((endType === 'on_date' ? endDate : monthlyThroughDate).split('-')[2])
        : undefined,
    specificDates: recurrenceType === 'specific_dates' ? specificDates : [],
    startTimeLocal,
    endTimeLocal,
    timezone,
    startDate,
    endType: recurrenceType === 'specific_dates' ? undefined : endType,
    endDate: recurrenceType === 'specific_dates' || endType === 'on_date' ? endDate : undefined,
    occurrenceCount: recurrenceType !== 'specific_dates' && endType === 'after_count' ? occurrenceCount : undefined,
    reason: reason.trim(),
  });

  const monthlyRangeValid =
    recurrenceType !== 'monthly' ||
    (endType === 'on_date'
      ? !!endDate && Number(endDate.split('-')[2]) >= Number(startDate.split('-')[2])
      : monthlyThroughDate >= startDate && monthlyThroughDate.slice(0, 7) === startDate.slice(0, 7));

  const formValid =
    laneCodes.length > 0 &&
    timeSlots.length > 0 &&
    !!reason.trim() &&
    startDate >= todayStr() &&
    startTimeLocal < endTimeLocal &&
    monthlyRangeValid &&
    (recurrenceType === 'specific_dates'
      ? !!endDate && startDate <= endDate && specificDates.length > 0
      : (recurrenceType !== 'weekly' || daysOfWeek.length > 0) &&
        (endType !== 'on_date' || !!endDate) &&
        (endType !== 'after_count' || occurrenceCount >= 1));

  const handlePreview = async () => {
    setError('');
    setIsLoading(true);
    try {
      const entries = await Promise.all(
        laneCodes.map(async laneCode => {
          const res = await api.post(endpoints.recurringBlocks.preview, coreFieldsFor(laneCode));
          return [laneCode, res.data?.data as SeriesPreviewResponse] as const;
        })
      );
      setPreviews(Object.fromEntries(entries));
      setStep('preview');
    } catch (e) {
      setError(handleApiError(e, 'Failed to load the conflict preview.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Every (lane, date) booking conflict — member OR coach — across every
  // previewed lane. Both now require the same explicit admin decision
  // before anything is created/cancelled.
  const conflictOccurrencesByLane = laneCodes.map(laneCode => ({
    laneCode,
    occurrences: (previews[laneCode]?.occurrences || []).filter(
      o => o.conflictType === 'member' || o.conflictType === 'coach'
    ),
  }));
  const allConflictsResolved = conflictOccurrencesByLane.every(({ laneCode, occurrences }) =>
    occurrences.every(o => {
      const r = conflictResolutions[resolutionKey(laneCode, o.occurrenceDate)];
      return r && (r.decision === 'keep' || (r.decision === 'cancel' && r.reason.trim()));
    })
  );
  const totalMemberConflicts = laneCodes.reduce((sum, l) => sum + (previews[l]?.memberConflictCount || 0), 0);
  const totalCoachConflicts = laneCodes.reduce((sum, l) => sum + (previews[l]?.coachConflictCount || 0), 0);
  // The lane grid only has slot timings open a limited distance out — a date
  // beyond that horizon has no slot doc to block yet. It is NOT abandoned:
  // the background extension job (recurringblocks' run_extension_job, every
  // 15 minutes) re-checks every active series and blocks any such date
  // automatically the first run after its slot doc appears. Surfaced here so
  // the admin isn't left thinking the series only covers the few dates
  // blocked today.
  const totalNotYetCreated = laneCodes.reduce(
    (sum, l) => sum + (previews[l]?.occurrences || []).filter(o => o.conflictType === 'not_yet_created').length,
    0
  );
  const totalOccurrencesPreviewed = laneCodes.reduce((sum, l) => sum + (previews[l]?.occurrences || []).length, 0);

  const handleCreate = async () => {
    setError('');
    setIsLoading(true);
    try {
      const outcomes = await Promise.all(
        laneCodes.map(async laneCode => {
          const laneConflictOccurrences = (previews[laneCode]?.occurrences || []).filter(
            o => o.conflictType === 'member' || o.conflictType === 'coach'
          );
          const resolutions: ConflictResolution[] = laneConflictOccurrences.map(o => {
            const r = conflictResolutions[resolutionKey(laneCode, o.occurrenceDate)];
            return {
              occurrenceDate: o.occurrenceDate,
              decision: r.decision,
              reason: r.decision === 'cancel' ? r.reason.trim() : undefined,
            };
          });
          try {
            const res = await api.post(endpoints.recurringBlocks.create, {
              ...coreFieldsFor(laneCode),
              idempotencyKey: `${idempotencyBase}-${laneCode}`,
              conflictResolutions: resolutions,
            });
            return { laneCode, response: res.data?.data as CreateSeriesResponse, error: null as string | null };
          } catch (e) {
            return {
              laneCode,
              response: null as CreateSeriesResponse | null,
              error: handleApiError(e, 'Failed to create the series.'),
            };
          }
        })
      );
      const nextResults: Record<string, CreateSeriesResponse> = {};
      const nextErrors: Record<string, string> = {};
      outcomes.forEach(({ laneCode, response, error: laneError }) => {
        if (response) nextResults[laneCode] = response;
        if (laneError) nextErrors[laneCode] = laneError;
      });
      setResults(nextResults);
      setCreateErrors(nextErrors);
      setStep('result');
    } catch (e) {
      setError(handleApiError(e, 'Failed to create the series.'));
    } finally {
      setIsLoading(false);
    }
  };

  const laneLabel = (laneCode: string) => {
    const lane = lanes.find(l => l.laneCode === laneCode);
    return lane ? `Lane ${lane.laneNo} (${lane.laneType})` : laneCode;
  };

  const selectedDayLabels = DAYS.filter(d => daysOfWeek.includes(d.value)).map(d => d.label);
  const endCondition = (unit: 'week' | 'month') =>
    endType === 'never'
      ? 'with no end date'
      : endType === 'on_date'
        ? `until ${endDate}`
        : `for ${occurrenceCount} ${unit}${occurrenceCount !== 1 ? 's' : ''}`;
  const monthlyRangeEndDate = endType === 'on_date' ? endDate : monthlyThroughDate;
  const whenSummary =
    recurrenceType === 'weekly'
      ? `every ${selectedDayLabels.join('/') || '…'} at ${startTimeLocal}, from ${startDate} ${endCondition('week')}`
      : recurrenceType === 'monthly'
        ? `day${monthlyRangeEndDate.slice(8) !== startDate.slice(8) ? 's' : ''} ${startDate.slice(8)}${
            monthlyRangeEndDate.slice(8) !== startDate.slice(8) ? `-${monthlyRangeEndDate.slice(8)}` : ''
          } of every month at ${startTimeLocal}, ${endCondition('month')}`
        : `${specificDates.length} specific date${specificDates.length !== 1 ? 's' : ''} at ${startTimeLocal}`;

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
        className="max-h-[90vh] w-full max-w-[95%] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-w-xl"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#21295A]">New Recurring Block</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Reserve one or more lanes on a weekly schedule, e.g. for a clinic
            </p>
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

          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <span className={labelCls}>
                  Lanes
                  <Required />
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#B3DADA] bg-white p-3 sm:grid-cols-3">
                  {lanes.map(l => (
                    <label key={l.laneCode} className="flex items-center gap-2 text-[13px] text-[#21295A]">
                      <input
                        checked={laneCodes.includes(l.laneCode)}
                        type="checkbox"
                        onChange={() => toggleLane(l.laneCode)}
                      />
                      Lane {l.laneNo} <span className="text-gray-400">({l.laneType})</span>
                    </label>
                  ))}
                </div>
                {laneCodes.length === 0 && <p className="mt-1 text-[12px] text-red-500">Select at least one lane.</p>}
              </div>

              <div>
                <label className={labelCls} htmlFor="ns-end-type">
                  Ends
                </label>
                <select
                  className={inputCls}
                  id="ns-end-type"
                  value={endsOptionValue(recurrenceType, endType)}
                  onChange={e => {
                    const { recurrenceType: rt, endType: et } = parseEndsOption(e.target.value);
                    setRecurrenceType(rt);
                    setEndType(et);
                  }}
                >
                  <option value="weekly_after_count">Weekly — After a number of occurrences</option>
                  <option value="weekly_on_date">Weekly — On a specific date</option>
                  <option value="monthly_after_count">Monthly — After a number of occurrences</option>
                  <option value="monthly_on_date">Monthly — On a specific date</option>
                  <option value="specific_dates">Specific dates</option>
                </select>
              </div>

              {recurrenceType === 'weekly' && (
                <div>
                  <span className={labelCls}>
                    Repeats on
                    <Required />
                  </span>
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#B3DADA] bg-white p-3 sm:grid-cols-4">
                    {DAYS.map(d => (
                      <label key={d.value} className="flex items-center gap-2 text-[13px] text-[#21295A]">
                        <input
                          checked={daysOfWeek.includes(d.value)}
                          type="checkbox"
                          onChange={() => toggleDay(d.value)}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                  {daysOfWeek.length === 0 && <p className="mt-1 text-[12px] text-red-500">Select at least one day.</p>}
                  <p className="mt-1.5 text-[12px] text-gray-500">
                    This series repeats on every checked day each week, starting from the date below, until the end
                    condition you choose above. For a single one-off date with no weekly repeat, close this and use the
                    block option on the calendar grid instead.
                  </p>
                </div>
              )}

              <div
                className={
                  recurrenceType === 'specific_dates' ||
                  (recurrenceType === 'monthly' && endType !== 'on_date') ||
                  endType === 'never'
                    ? ''
                    : 'grid grid-cols-2 gap-3'
                }
              >
                <div className={recurrenceType === 'monthly' && endType !== 'on_date' ? 'grid grid-cols-2 gap-3' : ''}>
                  <div>
                    <label className={labelCls} htmlFor="ns-start-date">
                      Starting from
                      <Required />
                    </label>
                    <input
                      className={inputCls}
                      id="ns-start-date"
                      min={todayStr()}
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                    {startDate < todayStr() && (
                      <p className="mt-1 text-[12px] text-red-500">Starting date cannot be in the past.</p>
                    )}
                  </div>
                  {recurrenceType === 'monthly' && endType !== 'on_date' && (
                    <div>
                      <label className={labelCls} htmlFor="ns-monthly-through">
                        End date
                        <Required />
                      </label>
                      <input
                        className={inputCls}
                        id="ns-monthly-through"
                        min={startDate}
                        type="date"
                        value={monthlyThroughDate}
                        onChange={e => setMonthlyThroughDate(e.target.value)}
                      />
                      {monthlyThroughDate < startDate && (
                        <p className="mt-1 text-[12px] text-red-500">End date must be on or after Starting from.</p>
                      )}
                      {monthlyThroughDate.slice(0, 7) !== startDate.slice(0, 7) && (
                        <p className="mt-1 text-[12px] text-red-500">
                          End date must be in the same month as Starting from.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {recurrenceType === 'weekly' && endType === 'after_count' && (
                  <div>
                    <label className={labelCls} htmlFor="ns-count">
                      Number of weeks
                      <Required />
                    </label>
                    <input
                      className={inputCls}
                      id="ns-count"
                      min={1}
                      type="number"
                      value={occurrenceCount}
                      onChange={e => setOccurrenceCount(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                )}
                {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && endType === 'on_date' && (
                  <div>
                    <label className={labelCls} htmlFor="ns-end-date">
                      End date
                      <Required />
                    </label>
                    <input
                      className={inputCls}
                      id="ns-end-date"
                      min={startDate}
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                    {recurrenceType === 'monthly' &&
                      !!endDate &&
                      Number(endDate.split('-')[2]) < Number(startDate.split('-')[2]) && (
                        <p className="mt-1 text-[12px] text-red-500">
                          End date&apos;s day-of-month must be on or after Starting from&apos;s day-of-month (its day
                          becomes the range&apos;s last day).
                        </p>
                      )}
                  </div>
                )}
                {recurrenceType === 'specific_dates' && (
                  <div>
                    <label className={labelCls} htmlFor="ns-end-date">
                      End date
                      <Required />
                    </label>
                    <input
                      className={inputCls}
                      id="ns-end-date"
                      min={startDate}
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                    {!!startDate && !!endDate && startDate > endDate && (
                      <p className="mt-1 text-[12px] text-red-500">End date must be on or after the start date.</p>
                    )}
                  </div>
                )}
              </div>

              {recurrenceType === 'monthly' && endType === 'after_count' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="ns-count">
                      Number of months
                      <Required />
                    </label>
                    <input
                      className={inputCls}
                      id="ns-count"
                      min={1}
                      type="number"
                      value={occurrenceCount}
                      onChange={e => setOccurrenceCount(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>
              )}

              {recurrenceType === 'specific_dates' && (
                <div>
                  <span className={labelCls}>
                    Dates
                    <Required />
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      max={endDate || undefined}
                      min={startDate || todayStr()}
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
                    This series blocks exactly the dates you add here — nothing is generated automatically and no
                    pattern repeats. Add every date individually, within the Start/End range above.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="ns-start-time">
                    Start time
                    <Required />
                  </label>
                  <select
                    className={inputCls}
                    id="ns-start-time"
                    value={startTimeLocal}
                    onChange={e => setStartTimeLocal(e.target.value)}
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ns-end-time">
                    End time
                    <Required />
                  </label>
                  <select
                    className={inputCls}
                    id="ns-end-time"
                    value={endTimeLocal}
                    onChange={e => setEndTimeLocal(e.target.value)}
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-[12px] text-gray-400">Times are restricted to this centre&apos;s slot grid.</p>
              {startTimeLocal >= endTimeLocal && (
                <p className="text-[12px] text-red-500">Start time must be before end time.</p>
              )}

              <div>
                <label className={labelCls} htmlFor="ns-reason">
                  Reason
                  <Required />
                </label>
                <textarea
                  className={inputCls}
                  id="ns-reason"
                  maxLength={500}
                  placeholder="e.g. Youth coaching clinic"
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                  disabled={!formValid || isLoading}
                  type="button"
                  onClick={handlePreview}
                >
                  {isLoading ? <LoaderSpinner className="text-white" size="sm" /> : 'Review dates'}
                </button>
                <button
                  className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] hover:border-[#21295A] hover:bg-gray-50"
                  disabled={isLoading}
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
                This will block {whenSummary} across {laneCodes.length} lane{laneCodes.length !== 1 ? 's' : ''}.{' '}
                {totalMemberConflicts > 0 && (
                  <>
                    {totalMemberConflicts} existing member booking{totalMemberConflicts !== 1 ? 's' : ''}{' '}
                  </>
                )}
                {totalMemberConflicts > 0 && totalCoachConflicts > 0 && 'and '}
                {totalCoachConflicts > 0 && (
                  <>
                    {totalCoachConflicts} coach booking{totalCoachConflicts !== 1 ? 's' : ''}{' '}
                  </>
                )}
                {totalMemberConflicts + totalCoachConflicts > 0 && 'need your decision below.'}
              </div>

              {totalNotYetCreated > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-medium text-blue-800">
                  ⚠️ {totalNotYetCreated} of {totalOccurrencesPreviewed} date
                  {totalOccurrencesPreviewed !== 1 ? 's' : ''} don&apos;t have an open slot yet on this lane. They
                  won&apos;t be reserved today — the system automatically reserves each one as soon as that date&apos;s
                  slot opens, with no action needed from you.
                </div>
              )}

              <div className="max-h-[320px] space-y-4 overflow-y-auto rounded-xl border border-gray-200 p-3">
                {laneCodes.map(laneCode => (
                  <div key={laneCode}>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                      {laneLabel(laneCode)}
                    </p>
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                      {(previews[laneCode]?.occurrences || []).map((o: OccurrencePreview) => {
                        const badge = CONFLICT_BADGE[o.conflictType];
                        const key = resolutionKey(laneCode, o.occurrenceDate);
                        return (
                          <div key={o.occurrenceDate} className="border-b border-gray-100 px-3 py-2 last:border-b-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-[#21295A]">{o.occurrenceDate}</span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            {o.booking && (
                              <p className="mt-0.5 text-[12px] text-gray-500">
                                {o.booking.memberName || '(unknown member)'} — {o.booking.bookingCode}
                              </p>
                            )}
                            {(o.conflictType === 'member' || o.conflictType === 'coach') && (
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                                  value={conflictResolutions[key]?.decision || ''}
                                  onChange={e =>
                                    setConflictResolutions(prev => ({
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
                                {conflictResolutions[key]?.decision === 'cancel' && (
                                  <input
                                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                                    placeholder="Reason (required)"
                                    value={conflictResolutions[key]?.reason || ''}
                                    onChange={e =>
                                      setConflictResolutions(prev => ({
                                        ...prev,
                                        [key]: { decision: 'cancel', reason: e.target.value },
                                      }))
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 text-[13px] text-gray-600">
                <input
                  checked={confirmChecked}
                  className="mt-0.5"
                  type="checkbox"
                  onChange={e => setConfirmChecked(e.target.checked)}
                />
                I confirm this will block {whenSummary} on {laneCodes.length} lane{laneCodes.length !== 1 ? 's' : ''}.
                {totalNotYetCreated > 0 && (
                  <>
                    {' '}
                    {totalOccurrencesPreviewed - totalNotYetCreated} date
                    {totalOccurrencesPreviewed - totalNotYetCreated !== 1 ? 's' : ''} will be reserved now;{' '}
                    {totalNotYetCreated} date{totalNotYetCreated !== 1 ? 's' : ''} will be reserved automatically once
                    their slots open.
                  </>
                )}
              </label>

              <div className="flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!confirmChecked || !allConflictsResolved || isLoading}
                  type="button"
                  onClick={handleCreate}
                >
                  {isLoading ? <LoaderSpinner className="text-white" size="sm" /> : 'Create series'}
                </button>
                <button
                  className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] hover:bg-gray-50"
                  disabled={isLoading}
                  type="button"
                  onClick={() => setStep('form')}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              {laneCodes.map(laneCode => {
                const result = results[laneCode];
                const laneError = createErrors[laneCode];
                return (
                  <div
                    key={laneCode}
                    className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
                      laneError
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    <p className="mb-0.5 font-semibold">{laneLabel(laneCode)}</p>
                    {laneError ? (
                      laneError
                    ) : result ? (
                      <>
                        {result.idempotentReplay ? 'Already created. ' : 'Series created. '}
                        {
                          result.occurrences.filter(o =>
                            ['blocked', 'member_cancelled_and_blocked', 'coach_cancelled_and_blocked'].includes(
                              o.outcome
                            )
                          ).length
                        }{' '}
                        date(s) blocked.
                        {(() => {
                          const notYetCreatedCount = result.occurrences.filter(
                            o => o.outcome === 'not_yet_created'
                          ).length;
                          return (
                            notYetCreatedCount > 0 && (
                              <span className="block text-blue-700">
                                {notYetCreatedCount} date(s) will be reserved automatically once their slots open — no
                                action needed.
                              </span>
                            )
                          );
                        })()}
                        {result.unresolvedConflicts.length > 0 && (
                          <span className="block text-amber-700">
                            {result.unresolvedConflicts.length} date(s) left untouched:{' '}
                            {result.unresolvedConflicts.join(', ')}
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
              <button
                className="w-full rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white"
                type="button"
                onClick={() => {
                  onCreated();
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

export default NewSeriesModal;
