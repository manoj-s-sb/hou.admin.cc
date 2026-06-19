import { useState } from 'react';

import { TailgateLog } from '../../../store/tailgate/types';
import { eventMap, getPageNumbers } from '../constants';
import { getEffectiveEventType, getLogDate, getLogDateVal, getLogStatus, getLogTime, getPersonCount } from '../utils';

interface UnidentifiedTabProps {
  logs: TailgateLog[];
  isLoading: boolean;
  totalRows: number;
  totalPages: number;
  page: number;
  rowsPerPage: number;
  firstDateOffset: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  onVideoClick: (row: TailgateLog) => void;
  onReviewClick: (row: TailgateLog) => void;
  onViewClick: (row: TailgateLog) => void;
}

const UnidentifiedTab = ({
  logs,
  isLoading,
  totalRows,
  totalPages,
  page,
  rowsPerPage,
  firstDateOffset,
  onPageChange,
  onRowsPerPageChange,
  onVideoClick,
  onReviewClick,
  onViewClick,
}: UnidentifiedTabProps) => {
  // Server already returns only unidentified events — group by date
  const grouped: Record<string, { date: string; items: TailgateLog[] }> = {};
  logs.forEach(l => {
    const dv = getLogDateVal(l);
    if (!grouped[dv]) grouped[dv] = { date: getLogDate(l), items: [] };
    grouped[dv].items.push(l);
  });
  const [timeSortDir, setTimeSortDir] = useState<'asc' | 'desc'>('asc');
  const sortedDates = Object.keys(grouped);
  sortedDates.forEach(d =>
    grouped[d].items.sort((a, b) => {
      const cmp = a.timeStampms - b.timeStampms;
      return timeSortDir === 'asc' ? cmp : -cmp;
    })
  );

  const pageNumbers = getPageNumbers(page, totalPages);
  const todayVal = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

  // Server returns only the current page's logs; render the grouped dates as-is
  // and compute each group's starting global S.No from the page's first offset.
  const pagedDates = sortedDates;
  const pagedGroups = grouped;
  const groupStartIndex: Record<string, number> = {};
  let runningOffset = firstDateOffset;
  pagedDates.forEach(dv => {
    groupStartIndex[dv] = runningOffset;
    runningOffset += grouped[dv].items.length;
  });

  if (isLoading) {
    return <p className="py-10 text-center text-[13px] text-gray-400">Loading…</p>;
  }

  return (
    <>
      {totalRows === 0 ? (
        <p className="py-10 text-center text-[13px] text-gray-400">No pending entries.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {['S.No', 'Time', 'Video', 'Event Type', 'Lane Door', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h === 'Time' ? (
                      <button
                        className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-[#21295A]"
                        type="button"
                        onClick={() => setTimeSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                      >
                        Time
                        <span className="opacity-40 transition-opacity group-hover:opacity-100">
                          {timeSortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      </button>
                    ) : (
                      h
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedDates.flatMap(dv => {
                const { date, items } = pagedGroups[dv];
                const startOffset = groupStartIndex[dv] ?? 0;
                const dayDiff = Math.round(
                  (new Date(todayVal).getTime() - new Date(dv).getTime()) / (1000 * 60 * 60 * 24)
                );
                const ageCls =
                  dayDiff === 0
                    ? 'bg-green-100 text-green-700'
                    : dayDiff === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700';
                const ageLabel = dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Yesterday' : `${dayDiff}d old`;
                return [
                  <tr key={`hdr-${dv}`} className="bg-gray-50/80">
                    <td className="px-4 py-2" colSpan={6}>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#21295A]">{date}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ageCls}`}>{ageLabel}</span>
                        <span className="text-[11px] text-gray-400">
                          {items.length} event{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                  </tr>,
                  ...items.map((row, idx) => {
                    const globalIdx = startOffset + idx + 1;
                    const evType = getEffectiveEventType(row);
                    const {
                      label: evLabel,
                      className: evCls,
                      gradient,
                    } = eventMap[evType] || {
                      label: evType,
                      className: 'bg-gray-100 text-gray-600',
                      gradient: 'linear-gradient(135deg,#1f2937,#4b5563)',
                    };
                    const count = getPersonCount(row);
                    return (
                      <tr key={row.id} className="border-t border-gray-100 bg-yellow-50/30 hover:bg-yellow-50">
                        <td className="px-4 py-3 text-[13px] font-medium text-gray-400">{globalIdx}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-700">{getLogTime(row)}</td>
                        <td className="px-4 py-3">
                          <button
                            className="flex flex-col items-center gap-1"
                            type="button"
                            onClick={() => onVideoClick(row)}
                          >
                            <div
                              className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-lg"
                              style={{ background: row.snapshotUrl ? undefined : gradient }}
                            >
                              {row.snapshotUrl && (
                                <img
                                  alt="snapshot"
                                  className="absolute inset-0 h-full w-full object-cover"
                                  src={row.snapshotUrl}
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
                                  <svg
                                    className="ml-0.5 h-2.5 w-2.5 text-[#21295A]"
                                    fill="currentColor"
                                    viewBox="0 0 10 12"
                                  >
                                    <polygon points="1,0 9,6 1,12" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {count} person{count !== 1 ? 's' : ''}
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evCls}`}>
                            {evLabel}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {row.door?.name ?? '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
                              type="button"
                              onClick={() => onViewClick(row)}
                            >
                              View
                            </button>
                            <button
                              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition ${getLogStatus(row) === 'pending' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-[#21295A] hover:bg-[#1a2147]'}`}
                              type="button"
                              onClick={() => onReviewClick(row)}
                            >
                              {getLogStatus(row) === 'pending' ? 'Review Now' : 'Edit'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rows per page:</span>
              <select
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
                value={rowsPerPage}
                onChange={e => onRowsPerPageChange(parseInt(e.target.value, 10))}
              >
                {[10, 20, 30, 50, 100].map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">
                {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === 0}
                type="button"
                onClick={() => onPageChange(page - 1)}
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1 px-1">
                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      type="button"
                      onClick={() => onPageChange(p as number)}
                    >
                      {(p as number) + 1}
                    </button>
                  )
                )}
              </div>
              <button
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= totalPages - 1}
                type="button"
                onClick={() => onPageChange(page + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnidentifiedTab;
