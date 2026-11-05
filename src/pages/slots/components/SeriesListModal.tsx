import { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';

import { LoaderSpinner } from '../../../components/Loader';
import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { SeriesListItem } from '../../../store/recurringBlocks/types';
import { Lanes } from '../../../store/slots/types';
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
// FS-163: "28th–31st of every month" / "16th of every month" — "Every" moved
// to the end of the phrase (matching the ticket's suggested wording), en dash
// for the range instead of a hyphen.
const formatMonthly = (startDate: string, monthlyEndDay?: number) => {
  const startDay = Number(startDate.split('-')[2]);
  const endDay = monthlyEndDay ?? startDay;
  return endDay === startDay
    ? `${ordinal(startDay)} of every month`
    : `${ordinal(startDay)}–${ordinal(endDay)} of every month`;
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
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "28 Oct 2026" — day-month-year, no weekday, matching FS-163's suggested row layout. */
const formatDayMonthYear = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "1 date" / "4 dates" — FS-163's singular/plural fix (the confirm text and
 * row subtitle both used to say "date(s)" literally, regardless of count). */
const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
  /** For the lane label ("Lane 4 (Batting)") instead of the raw system lane
   * code — same data the New Series modal already receives from this page. */
  lanes: Lanes[];
  onClose: () => void;
  /** Called after an action that changes slot availability, so the calendar
   * grid refreshes. */
  onChanged: () => void;
}

const SeriesListModal = ({ isOpen, facilityCode, lanes, onClose, onChanged }: SeriesListModalProps) => {
  const [items, setItems] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Keyed by group signature while that group's Stop-series action is in flight.
  const [stoppingKey, setStoppingKey] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // FS-163: the "Stop series" confirm — the group it targets (null = closed),
  // plus the admin's choice of the two options inside it.
  const [stopTarget, setStopTarget] = useState<SeriesGroup | null>(null);
  const [freeReservedToo, setFreeReservedToo] = useState(false);

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

  const laneLabel = (laneCode: string) => {
    const lane = lanes.find(l => l.laneCode === laneCode);
    return lane ? `Lane ${lane.laneNo} (${lane.laneType})` : laneCode;
  };

  const openStopModal = (group: SeriesGroup) => {
    setFreeReservedToo(false);
    setStopTarget(group);
  };

  // FS-163: one action replacing the old separate "Unblock slots" / "Cancel
  // series" buttons — always stops future generation; freeing the dates
  // already reserved is the admin's explicit second choice in the modal,
  // not a separate click they could forget.
  const handleConfirmStop = async () => {
    if (!stopTarget) return;
    const group = stopTarget;
    setStoppingKey(group.key);
    try {
      const activeItems = group.items.filter(i => i.series.status !== 'cancelled');
      for (const item of activeItems) {
        // eslint-disable-next-line no-await-in-loop
        await api.post(endpoints.recurringBlocks.cancel, { seriesId: item.series.id, expectedEtag: item.series.etag });
      }
      if (freeReservedToo) {
        const reservedItems = group.items.filter(i => i.remainingBlockedCount > 0);
        for (const item of reservedItems) {
          // eslint-disable-next-line no-await-in-loop
          await api.post(endpoints.recurringBlocks.unblockAll, { seriesId: item.series.id });
        }
        if (reservedItems.length > 0) onChanged();
      }
      toast.success('Series stopped');
      setStopTarget(null);
      load();
    } catch (e) {
      setError(handleApiError(e, 'Failed to stop the series.'));
    } finally {
      setStoppingKey(null);
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
                const first = group.items[0].series;
                const isMultiLane = group.items.length > 1;
                const expanded = !!expandedGroups[group.key];
                const totalRemaining = group.items.reduce((sum, i) => sum + i.remainingBlockedCount, 0);
                const anyActive = group.items.some(i => i.series.status !== 'cancelled');
                // Same action, same admin, fired within the same Stop-series
                // click when cancelling a multi-lane group — the first lane's
                // cancellation fields are representative of the whole group.
                const cancelledInfo = !anyActive ? first : undefined;

                return (
                  <div key={group.key} className="rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        disabled={!isMultiLane}
                        type="button"
                        onClick={() => isMultiLane && toggleGroup(group.key)}
                      >
                        {isMultiLane && (
                          <svg
                            className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                          </svg>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-[#21295A]" title={first.reason}>
                              {first.reason}
                            </span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[anyActive ? 'active' : 'cancelled']}`}
                            >
                              {capitalize(anyActive ? 'active' : 'cancelled')}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-gray-600">
                            {isMultiLane ? `${group.items.length} lanes` : laneLabel(first.laneCode)} ·{' '}
                            {formatSchedule(first)} · {first.startTimeLocal}–{first.endTimeLocal}
                          </p>
                          <p className="mt-0.5 text-[12px] text-gray-500">
                            {pluralize(totalRemaining, 'date')} reserved
                            {first.createdByName && (
                              <>
                                {' '}
                                · Created by {first.createdByName}, {formatDayMonthYear(first.createdAt)}
                              </>
                            )}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {anyActive ? (
                          <button
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={stoppingKey === group.key}
                            type="button"
                            onClick={() => openStopModal(group)}
                          >
                            {stoppingKey === group.key ? 'Stopping…' : 'Stop series'}
                          </button>
                        ) : (
                          cancelledInfo && (
                            <p className="text-right text-[12px] text-gray-500">
                              Cancelled on {formatDayMonthYear(cancelledInfo.cancelledAt)}
                              {cancelledInfo.cancelledByName && <> by {cancelledInfo.cancelledByName}</>}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    {isMultiLane && expanded && (
                      <div className="mt-3 overflow-x-auto border-t border-gray-100 pt-3">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              <th className="py-2 pr-3">Lane</th>
                              <th className="py-2 pr-3">Status</th>
                              <th className="py-2 pr-3">Dates reserved</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map(item => (
                              <tr key={item.series.id} className="border-t border-gray-100">
                                <td className="py-2 pr-3 text-[#21295A]">{laneLabel(item.series.laneCode)}</td>
                                <td className="py-2 pr-3">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[item.series.status]}`}
                                  >
                                    {capitalize(item.series.status)}
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

      {/* FS-163: "Stop series" — the portal's own modal, replacing the two
          separate browser-native confirm() popups and the two separate
          Unblock/Cancel buttons. */}
      {stopTarget &&
        (() => {
          const group = stopTarget;
          const isMultiLane = group.items.length > 1;
          const totalRemaining = group.items.reduce((sum, i) => sum + i.remainingBlockedCount, 0);
          return (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
              role="presentation"
              onClick={e => {
                if (e.target === e.currentTarget) setStopTarget(null);
              }}
            >
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-[#21295A]">Stop series</h3>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
                    onClick={() => setStopTarget(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[13px] text-gray-600">
                    <span className="font-semibold text-gray-800">{group.items[0].series.reason}</span>
                    {isMultiLane
                      ? ` across ${pluralize(group.items.length, 'lane')}`
                      : ` on ${laneLabel(group.items[0].series.laneCode)}`}
                    . This always stops any FUTURE dates from being reserved.
                  </p>
                  <div className="mt-4 space-y-2">
                    <label className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50">
                      <input
                        checked={!freeReservedToo}
                        className="mt-0.5"
                        name="stop-series-option"
                        type="radio"
                        onChange={() => setFreeReservedToo(false)}
                      />
                      <span>
                        <span className="font-medium text-[#21295A]">Stop future dates only</span>
                        <br />
                        Keep the {pluralize(totalRemaining, 'date')} already reserved.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50">
                      <input
                        checked={freeReservedToo}
                        className="mt-0.5"
                        name="stop-series-option"
                        type="radio"
                        onChange={() => setFreeReservedToo(true)}
                      />
                      <span>
                        <span className="font-medium text-[#21295A]">
                          Stop future dates and free the already reserved dates
                        </span>
                        <br />
                        Also frees the {pluralize(totalRemaining, 'date')} already reserved.
                      </span>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      className="w-full rounded-lg bg-[#21295A] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={stoppingKey === group.key}
                      type="button"
                      onClick={handleConfirmStop}
                    >
                      {stoppingKey === group.key ? 'Stopping…' : 'Stop series'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default SeriesListModal;
