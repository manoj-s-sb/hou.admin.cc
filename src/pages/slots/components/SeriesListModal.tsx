import { useEffect, useMemo, useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { SeriesListItem } from '../../../store/recurringBlocks/types';
import { handleApiError } from '../../../utils/errorUtils';

const SHORT_DAY: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};
const SHORT_DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const formatDaysOfWeek = (daysOfWeek: string[]) =>
  [...daysOfWeek]
    .sort((a, b) => SHORT_DAY_ORDER.indexOf(a) - SHORT_DAY_ORDER.indexOf(b))
    .map(d => SHORT_DAY[d] || d)
    .join(', ');

/** A hand-picked date list shows as the first few dates plus a "+N more" tail
 * once it gets long — showing all of them would blow out the table row for a
 * series with many dates. */
const MAX_DATES_SHOWN = 3;
const formatSpecificDates = (specificDates: string[]) => {
  const sorted = [...specificDates].sort();
  if (sorted.length <= MAX_DATES_SHOWN) return sorted.join(', ');
  const shown = sorted.slice(0, MAX_DATES_SHOWN).join(', ');
  return `${shown} +${sorted.length - MAX_DATES_SHOWN} more`;
};

/** "16" -> "16th" — for the monthly schedule display, derived from startDate's own day. */
const ordinal = (n: number): string => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};
const formatMonthly = (startDate: string, monthlyEndDay?: number) => {
  const startDay = Number(startDate.split('-')[2]);
  const endDay = monthlyEndDay ?? startDay;
  return endDay === startDay
    ? `Every ${ordinal(startDay)} of the month`
    : `Every ${ordinal(startDay)}-${ordinal(endDay)} of the month`;
};

/** The schedule column's description, picked by the series' own recurrenceType. */
const formatSchedule = (series: {
  recurrenceType: string;
  daysOfWeek: string[];
  specificDates: string[];
  startDate: string;
  monthlyEndDay?: number;
}) =>
  series.recurrenceType === 'specific_dates'
    ? formatSpecificDates(series.specificDates)
    : series.recurrenceType === 'monthly'
      ? formatMonthly(series.startDate, series.monthlyEndDay)
      : formatDaysOfWeek(series.daysOfWeek);

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

/** Series created in one multi-lane "New Series" submission share every
 * pattern field except facilityCode/laneCode (and the per-lane-unique id/
 * idempotencyKey) — there's no persisted "batch id" anywhere, so this
 * signature is the closest reliable stand-in for "these rows are really the
 * same event, just one row per lane." */
const groupSignature = (series: SeriesListItem['series']): string =>
  [
    series.reason,
    series.recurrenceType,
    [...series.daysOfWeek].sort().join(','),
    series.monthlyEndDay ?? '',
    [...series.specificDates].sort().join(','),
    series.startTimeLocal,
    series.endTimeLocal,
    series.startDate,
    series.endType ?? '',
    series.endDate ?? '',
    series.occurrenceCount ?? '',
  ].join('|');

interface SeriesGroup {
  key: string;
  items: SeriesListItem[];
}

interface SeriesListModalProps {
  isOpen: boolean;
  facilityCode: string;
  onClose: () => void;
  /** Called after an "Unblock slots" so the calendar grid refreshes. */
  onChanged: () => void;
}

const SeriesListModal = ({ isOpen, facilityCode, onClose, onChanged }: SeriesListModalProps) => {
  const [items, setItems] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Keyed by seriesId while that one series' own call is in flight — used by
  // both single-series rows and as part of a group action's own busy state.
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Keyed by group signature while a GROUP action (looping every lane in it)
  // is in flight.
  const [unblockingGroup, setUnblockingGroup] = useState<string | null>(null);
  const [cancellingGroup, setCancellingGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const groups = useMemo<SeriesGroup[]>(() => {
    const byKey = new Map<string, SeriesListItem[]>();
    for (const item of items) {
      const key = groupSignature(item.series);
      const existing = byKey.get(key);
      if (existing) existing.push(item);
      else byKey.set(key, [item]);
    }
    return Array.from(byKey.entries()).map(([key, groupItems]) => ({ key, items: groupItems }));
  }, [items]);

  if (!isOpen) return null;

  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const unblockOne = async (item: SeriesListItem) => {
    await api.post(endpoints.recurringBlocks.unblockAll, { seriesId: item.series.id });
  };

  const cancelOne = async (item: SeriesListItem) => {
    await api.post(endpoints.recurringBlocks.cancel, { seriesId: item.series.id, expectedEtag: item.series.etag });
  };

  const handleUnblockAll = async (item: SeriesListItem) => {
    if (
      !window.confirm(
        `Free all ${item.remainingBlockedCount} currently-blocked date(s) for this series? The series itself keeps running — use Cancel series separately to stop future dates from being blocked.`
      )
    ) {
      return;
    }
    setUnblockingId(item.series.id);
    try {
      await unblockOne(item);
      onChanged();
      load();
    } catch (e) {
      setError(handleApiError(e, 'Failed to unblock the remaining dates.'));
    } finally {
      setUnblockingId(null);
    }
  };

  const handleCancelSeries = async (item: SeriesListItem) => {
    if (
      !window.confirm(
        'Cancel this series so it stops blocking any FUTURE dates? Any date already blocked stays blocked until you separately click Unblock slots.'
      )
    ) {
      return;
    }
    setCancellingId(item.series.id);
    try {
      await cancelOne(item);
      load();
    } catch (e) {
      setError(handleApiError(e, 'Failed to cancel the series.'));
    } finally {
      setCancellingId(null);
    }
  };

  const handleUnblockGroup = async (group: SeriesGroup) => {
    const targets = group.items.filter(i => i.remainingBlockedCount > 0);
    const totalBlocked = targets.reduce((sum, i) => sum + i.remainingBlockedCount, 0);
    if (
      !window.confirm(
        `Free all ${totalBlocked} currently-blocked date(s) across ${targets.length} lane${targets.length !== 1 ? 's' : ''} for this series? The series itself keeps running — use Cancel series separately to stop future dates from being blocked.`
      )
    ) {
      return;
    }
    setUnblockingGroup(group.key);
    try {
      for (const item of targets) {
        // eslint-disable-next-line no-await-in-loop
        await unblockOne(item);
      }
      onChanged();
      load();
    } catch (e) {
      setError(handleApiError(e, 'Failed to unblock the remaining dates for every lane.'));
    } finally {
      setUnblockingGroup(null);
    }
  };

  const handleCancelGroup = async (group: SeriesGroup) => {
    const targets = group.items.filter(i => i.series.status !== 'cancelled');
    if (
      !window.confirm(
        `Cancel this series across ${targets.length} lane${targets.length !== 1 ? 's' : ''} so it stops blocking any FUTURE dates? Any date already blocked stays blocked until you separately click Unblock slots.`
      )
    ) {
      return;
    }
    setCancellingGroup(group.key);
    try {
      for (const item of targets) {
        // eslint-disable-next-line no-await-in-loop
        await cancelOne(item);
      }
      load();
    } catch (e) {
      setError(handleApiError(e, 'Failed to stop the series for every lane.'));
    } finally {
      setCancellingGroup(null);
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
            <div className="space-y-3">
              {groups.map(group => {
                // A group of exactly one lane is just an ordinary series —
                // render it as a plain row, no accordion shell needed.
                if (group.items.length === 1) {
                  const [item] = group.items;
                  return (
                    <div key={group.key} className="rounded-xl border border-gray-200 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#21295A]">{item.series.laneCode}</span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[item.series.status]}`}
                            >
                              {item.series.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-gray-600">
                            {formatSchedule(item.series)} {item.series.startTimeLocal}–{item.series.endTimeLocal}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-gray-500" title={item.series.reason}>
                            {item.series.reason} — {item.remainingBlockedCount} remaining blocked
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={item.remainingBlockedCount === 0 || unblockingId === item.series.id}
                            type="button"
                            onClick={() => handleUnblockAll(item)}
                          >
                            {unblockingId === item.series.id ? 'Unblocking…' : 'Unblock slots'}
                          </button>
                          <button
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={item.series.status === 'cancelled' || cancellingId === item.series.id}
                            type="button"
                            onClick={() => handleCancelSeries(item)}
                          >
                            {cancellingId === item.series.id ? 'Cancelling…' : 'Cancel series'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                const first = group.items[0].series;
                const expanded = !!expandedGroups[group.key];
                const totalRemaining = group.items.reduce((sum, i) => sum + i.remainingBlockedCount, 0);
                const anyActive = group.items.some(i => i.series.status !== 'cancelled');

                return (
                  <div key={group.key} className="rounded-xl border border-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <button
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <svg
                          className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#21295A]" title={first.reason}>
                            {first.reason}{' '}
                            <span className="font-normal text-gray-400">({group.items.length} lanes)</span>
                          </p>
                          <p className="mt-0.5 text-[13px] text-gray-600">
                            {formatSchedule(first)} {first.startTimeLocal}–{first.endTimeLocal} · {totalRemaining}{' '}
                            remaining blocked
                          </p>
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={totalRemaining === 0 || unblockingGroup === group.key}
                          type="button"
                          onClick={() => handleUnblockGroup(group)}
                        >
                          {unblockingGroup === group.key ? 'Unblocking…' : 'Unblock slots'}
                        </button>
                        <button
                          className="rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!anyActive || cancellingGroup === group.key}
                          type="button"
                          onClick={() => handleCancelGroup(group)}
                        >
                          {cancellingGroup === group.key ? 'Cancelling…' : 'Cancel series'}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="overflow-x-auto border-t border-gray-100">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              <th className="py-2 pl-10 pr-3">Lane</th>
                              <th className="py-2 pr-3">Status</th>
                              <th className="py-2 pr-3">Remaining blocked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map(item => (
                              <tr key={item.series.id} className="border-t border-gray-100">
                                <td className="py-2 pl-10 pr-3 text-[#21295A]">{item.series.laneCode}</td>
                                <td className="py-2 pr-3">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[item.series.status]}`}
                                  >
                                    {item.series.status}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-gray-600">{item.remainingBlockedCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

export default SeriesListModal;
