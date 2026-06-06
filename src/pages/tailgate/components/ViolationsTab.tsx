import { useState } from 'react';

import { TailgateLog } from '../../../store/tailgate/types';
import { getPageNumbers } from '../constants';
import { getEffectiveEventType, getLogDate, getLogDateVal, getLogTime } from '../utils';

interface Actor {
  name: string | null;
  memberId: string | null;
  ini: string;
  ab: string;
  ac: string;
  actorType: string | null;
  incidents: TailgateLog[];
}

interface ViolationsTabProps {
  actors: Actor[];
  isLoading: boolean;
  totalRows: number;
  totalPages: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  onVideoClick: (row: TailgateLog) => void;
}

// Fixed column widths shared across all actor tables
const COL_WIDTHS = ['140px', '110px', '120px', '110px', '90px', '220px'];
const HEADERS = ['Date', 'Time', 'Event', 'Lane Door', 'Video', 'Admin Note'];

const ViolationsTab = ({
  actors,
  isLoading,
  totalRows,
  totalPages,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onVideoClick,
}: ViolationsTabProps) => {
  const [timeSortDir, setTimeSortDir] = useState<'asc' | 'desc'>('asc');
  const pageNumbers = getPageNumbers(page, totalPages);

  if (isLoading) {
    return <p className="py-10 text-center text-[13px] text-gray-400">Loading…</p>;
  }

  return (
    <>
      {actors.length === 0 && <p className="py-10 text-center text-[13px] text-gray-400">No violations recorded.</p>}

      {actors.map((actor, ri) => {
        const dateGroups: Record<string, { date: string; items: TailgateLog[] }> = {};
        actor.incidents.forEach(inc => {
          const dv = getLogDateVal(inc);
          if (!dateGroups[dv]) dateGroups[dv] = { date: getLogDate(inc), items: [] };
          dateGroups[dv].items.push(inc);
        });
        Object.keys(dateGroups).forEach(dv => {
          dateGroups[dv].items.sort((a, b) => {
            const cmp = a.timeStampms - b.timeStampms;
            return timeSortDir === 'asc' ? cmp : -cmp;
          });
        });
        const sortedDates = Object.keys(dateGroups);

        return (
          <div key={ri} className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {/* Actor header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ background: actor.ab, color: actor.ac }}
                >
                  {actor.ini}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#21295A]">{actor.name || 'Unknown'}</p>
                  {actor.memberId ? (
                    <p className="text-[11px] text-gray-400">Member · {actor.memberId}</p>
                  ) : (
                    <p className="text-[11px] text-gray-400">Non-Member</p>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-[13px] font-bold text-red-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                </svg>
                {actor.incidents.length} Violation{actor.incidents.length > 1 ? 's' : ''}
              </span>
            </div>

            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr className="bg-gray-50">
                  {HEADERS.map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {h === 'Time' ? (
                        <button
                          className="group flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-[#21295A]"
                          type="button"
                          onClick={() => setTimeSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                        >
                          Time
                          <span className="opacity-40 transition-opacity group-hover:opacity-100">
                            {timeSortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        </button>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDates.map(dv => [
                  sortedDates.length > 1 && (
                    <tr key={`date-${dv}`} className="bg-indigo-50/40">
                      <td className="px-4 py-1.5" colSpan={6}>
                        <span className="text-[11px] font-semibold text-[#21295A]">{dateGroups[dv].date}</span>
                        <span className="ml-2 text-[10px] text-gray-400">
                          {dateGroups[dv].items.length} incident{dateGroups[dv].items.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ),
                  ...dateGroups[dv].items.map(inc => (
                    <tr key={inc.id} className="border-t border-gray-50 hover:bg-red-50/30">
                      <td className="truncate px-4 py-2.5 text-[12px] text-gray-700">{getLogDate(inc)}</td>
                      <td className="px-4 py-2.5 text-[12px] text-gray-700">{getLogTime(inc)}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          ↩ {getEffectiveEventType(inc)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {inc.door?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="flex items-center" type="button" onClick={() => onVideoClick(inc)}>
                          <div className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-lg bg-[#1a2340]">
                            {inc.snapshotUrl && (
                              <img alt="snapshot" className="absolute inset-0 h-full w-full object-cover" src={inc.snapshotUrl} />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
                                <svg className="ml-0.5 h-2.5 w-2.5 text-[#21295A]" fill="currentColor" viewBox="0 0 10 12">
                                  <polygon points="1,0 9,6 1,12" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="truncate px-4 py-2.5 text-[12px] text-gray-500">{inc.review?.comment || '—'}</td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        );
      })}

      {totalRows > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page:</span>
            <select
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
              value={rowsPerPage}
              onChange={e => onRowsPerPageChange(parseInt(e.target.value, 10))}
            >
              {[10, 20, 30, 50, 100].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
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
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">...</span>
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
      )}
    </>
  );
};

export default ViolationsTab;
