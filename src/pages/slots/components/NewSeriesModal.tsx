import { useEffect, useMemo, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import {
  CoachConflictResolution,
  CreateSeriesResponse,
  DayOfWeek,
  OccurrencePreview,
  SeriesEndType,
  SeriesPreviewResponse,
} from '../../../store/recurringBlocks/types';
import { Lanes } from '../../../store/slots/types';

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

const DEFAULT_OCCURRENCE_COUNT = 12;

const CONFLICT_BADGE: Record<string, { label: string; cls: string }> = {
  none: { label: 'Available', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  member: { label: 'Member booking', cls: 'bg-red-50 text-red-700 border-red-200' },
  coach: { label: 'Coach booking', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  already_blocked: { label: 'Already blocked', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  not_yet_created: { label: 'Not created yet', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};

const dayNameFromDate = (dateStr: string): DayOfWeek => {
  const d = new Date(`${dateStr}T00:00:00`);
  return DAYS[d.getDay()].value;
};

/** Coach-resolution map key — per lane AND date, since the same date can be a
 * coach conflict on one lane and free on another. */
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
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(['sunday']);
  const defaultStart = timeSlots.includes('09:00') ? '09:00' : timeSlots[0] || '09:00';
  const [startTimeLocal, setStartTimeLocal] = useState(defaultStart);
  const [endTimeLocal, setEndTimeLocal] = useState(nextGridTime(timeSlots, defaultStart));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endType, setEndType] = useState<SeriesEndType>('after_count');
  const [endDate, setEndDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(DEFAULT_OCCURRENCE_COUNT);
  const [reason, setReason] = useState('');

  // Keyed by laneCode — each selected lane gets its own preview, since the
  // same date can be free on one lane and booked on another.
  const [previews, setPreviews] = useState<Record<string, SeriesPreviewResponse>>({});
  const [coachResolutions, setCoachResolutions] = useState<
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
    setDaysOfWeek([initialDate ? dayNameFromDate(initialDate) : 'sunday']);
    const resetStart = timeSlots.includes('09:00') ? '09:00' : timeSlots[0] || '09:00';
    setStartTimeLocal(resetStart);
    setEndTimeLocal(nextGridTime(timeSlots, resetStart));
    setStartDate(initialDate || new Date().toISOString().slice(0, 10));
    setEndType('after_count');
    setEndDate('');
    setOccurrenceCount(DEFAULT_OCCURRENCE_COUNT);
    setReason('');
    setPreviews({});
    setCoachResolutions({});
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

  const coreFieldsFor = (laneCode: string) => ({
    facilityCode,
    laneCode,
    daysOfWeek,
    startTimeLocal,
    endTimeLocal,
    timezone,
    startDate,
    endType,
    endDate: endType === 'on_date' ? endDate : undefined,
    occurrenceCount: endType === 'after_count' ? occurrenceCount : undefined,
    reason: reason.trim(),
  });

  const formValid =
    laneCodes.length > 0 &&
    daysOfWeek.length > 0 &&
    timeSlots.length > 0 &&
    !!reason.trim() &&
    startTimeLocal < endTimeLocal &&
    (endType !== 'on_date' || !!endDate) &&
    (endType !== 'after_count' || occurrenceCount >= 1);

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
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load the conflict preview.');
    } finally {
      setIsLoading(false);
    }
  };

  // Every (lane, date) coach conflict across every previewed lane.
  const coachOccurrencesByLane = laneCodes.map(laneCode => ({
    laneCode,
    occurrences: (previews[laneCode]?.occurrences || []).filter(o => o.conflictType === 'coach'),
  }));
  const allCoachConflictsResolved = coachOccurrencesByLane.every(({ laneCode, occurrences }) =>
    occurrences.every(o => {
      const r = coachResolutions[resolutionKey(laneCode, o.occurrenceDate)];
      return r && (r.decision === 'keep' || (r.decision === 'cancel' && r.reason.trim()));
    })
  );
  const totalMemberConflicts = laneCodes.reduce((sum, l) => sum + (previews[l]?.memberConflictCount || 0), 0);
  const totalCoachConflicts = laneCodes.reduce((sum, l) => sum + (previews[l]?.coachConflictCount || 0), 0);

  const handleCreate = async () => {
    setError('');
    setIsLoading(true);
    try {
      const outcomes = await Promise.all(
        laneCodes.map(async laneCode => {
          const laneCoachOccurrences = (previews[laneCode]?.occurrences || []).filter(o => o.conflictType === 'coach');
          const resolutions: CoachConflictResolution[] = laneCoachOccurrences.map(o => {
            const r = coachResolutions[resolutionKey(laneCode, o.occurrenceDate)];
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
              coachConflictResolutions: resolutions,
            });
            return { laneCode, response: res.data?.data as CreateSeriesResponse, error: null as string | null };
          } catch (e: any) {
            return {
              laneCode,
              response: null as CreateSeriesResponse | null,
              error: e?.response?.data?.message || 'Failed to create the series.',
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
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create the series.');
    } finally {
      setIsLoading(false);
    }
  };

  const laneLabel = (laneCode: string) => {
    const lane = lanes.find(l => l.laneCode === laneCode);
    return lane ? `Lane ${lane.laneNo} (${lane.laneType})` : laneCode;
  };

  const selectedDayLabels = DAYS.filter(d => daysOfWeek.includes(d.value)).map(d => d.label);
  const whenSummary = `every ${selectedDayLabels.join('/') || '…'} at ${startTimeLocal}, from ${startDate} ${
    endType === 'never'
      ? 'with no end date'
      : endType === 'on_date'
        ? `until ${endDate}`
        : `for ${occurrenceCount} week${occurrenceCount !== 1 ? 's' : ''}`
  }`;

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
                <span className={labelCls}>Lanes</span>
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
                <span className={labelCls}>Repeats on</span>
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
              </div>

              <div>
                <label className={labelCls} htmlFor="ns-start-date">
                  Starting from
                </label>
                <input
                  className={inputCls}
                  id="ns-start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="ns-start-time">
                    Start time
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
                <label className={labelCls} htmlFor="ns-end-type">
                  Ends
                </label>
                <select
                  className={inputCls}
                  id="ns-end-type"
                  value={endType}
                  onChange={e => setEndType(e.target.value as SeriesEndType)}
                >
                  <option value="after_count">After a number of occurrences</option>
                  <option value="on_date">On a specific date</option>
                  <option value="never">Never</option>
                </select>
              </div>
              {endType === 'after_count' && (
                <div>
                  <label className={labelCls} htmlFor="ns-count">
                    Number of weeks
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
              {endType === 'on_date' && (
                <div>
                  <label className={labelCls} htmlFor="ns-end-date">
                    End date
                  </label>
                  <input
                    className={inputCls}
                    id="ns-end-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={labelCls} htmlFor="ns-reason">
                  Reason
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
                    {totalMemberConflicts} existing member booking{totalMemberConflicts !== 1 ? 's' : ''} will be
                    cancelled and refunded.{' '}
                  </>
                )}
                {totalCoachConflicts > 0 && (
                  <>
                    {totalCoachConflicts} coach booking{totalCoachConflicts !== 1 ? 's' : ''} need your decision below.
                  </>
                )}
              </div>

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
                            {o.conflictType === 'coach' && (
                              <div className="mt-2 flex items-center gap-2">
                                <select
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                                  value={coachResolutions[key]?.decision || ''}
                                  onChange={e =>
                                    setCoachResolutions(prev => ({
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
                                {coachResolutions[key]?.decision === 'cancel' && (
                                  <input
                                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                                    placeholder="Reason (required)"
                                    value={coachResolutions[key]?.reason || ''}
                                    onChange={e =>
                                      setCoachResolutions(prev => ({
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
              </label>

              <div className="flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!confirmChecked || !allCoachConflictsResolved || isLoading}
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
