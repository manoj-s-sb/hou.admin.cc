import { TailgateLog } from '../../../store/tailgate/types';
import { eventMap, getPageNumbers, statusConfig, TABLE_HEADERS } from '../constants';
import {
  getAvatarData,
  getEffectiveEventType,
  getEffectiveName,
  getLogStatus,
  getLogTime,
  getPersonCount,
} from '../utils';

interface AllLogsTableProps {
  pagedDates: string[];
  pagedGroups: Record<string, { date: string; items: TailgateLog[] }>;
  totalRows: number;
  totalPages: number;
  page: number;
  rowsPerPage: number;
  firstDateOffset: number;
  timeSortDir: 'asc' | 'desc';
  onTimeSortToggle: () => void;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
  onVideoClick: (row: TailgateLog) => void;
  onReviewClick: (row: TailgateLog) => void;
  onViewClick: (row: TailgateLog) => void;
}

const renderIdentity = (row: TailgateLog) => {
  const name = getEffectiveName(row);
  const memberType = row.review?.reviewed ? row.review.memberType : (row.actor?.type ?? null);
  if (name) {
    const { ini, ab, ac } = getAvatarData(name);
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: ab, color: ac }}
        >
          {ini}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#21295A]">{name}</p>
          {memberType && <p className="text-[11px] text-gray-400">{memberType}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-yellow-400 bg-yellow-50 text-[11px] font-bold text-yellow-700">
        ?
      </div>
      <div>
        <p className="text-[13px] font-semibold text-yellow-700">Not identified</p>
        <p className="text-[11px] text-yellow-500">Needs review</p>
      </div>
    </div>
  );
};

const AllLogsTable = ({
  pagedDates,
  pagedGroups,
  totalRows,
  totalPages,
  page,
  rowsPerPage,
  firstDateOffset,
  timeSortDir,
  onTimeSortToggle,
  onPageChange,
  onRowsPerPageChange,
  onVideoClick,
  onReviewClick,
  onViewClick,
}: AllLogsTableProps) => {
  const pageNumbers = getPageNumbers(page, totalPages);
  const renderVideoCell = (row: TailgateLog) => {
    const evType = getEffectiveEventType(row);
    const grad = (eventMap[evType] || eventMap.Entry).gradient;
    const count = getPersonCount(row);
    return (
      <button className="flex flex-col items-center gap-1" type="button" onClick={() => onVideoClick(row)}>
        <div
          className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-lg"
          style={{ background: row.snapshotUrl ? undefined : grad }}
        >
          {row.snapshotUrl && (
            <img alt="snapshot" className="absolute inset-0 h-full w-full object-cover" src={row.snapshotUrl} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
              <svg className="ml-0.5 h-2.5 w-2.5 text-[#21295A]" fill="currentColor" viewBox="0 0 10 12">
                <polygon points="1,0 9,6 1,12" />
              </svg>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-gray-400">
          {count} person{count !== 1 ? 's' : ''}
        </span>
      </button>
    );
  };
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {TABLE_HEADERS.map(h => (
              <th
                key={h}
                className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                {h === 'Time' ? (
                  <button
                    className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-[#21295A]"
                    type="button"
                    onClick={onTimeSortToggle}
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
          {pagedDates.flatMap((dateVal, dateIdx) => {
            const group = pagedGroups[dateVal];
            const startSno = dateIdx === 0 ? firstDateOffset + 1 : 1;
            return [
              <tr key={`date-${dateVal}`} className="border-l-4 border-l-[#21295A] bg-[#21295A]/[0.06]">
                <td className="px-4 py-2.5" colSpan={TABLE_HEADERS.length}>
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0 text-[#21295A]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    <span className="text-[12px] font-bold text-[#21295A]">{group.date}</span>
                    <span className="h-px flex-1 bg-[#21295A]/15" />
                    <span className="rounded-full bg-[#21295A]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#21295A]">
                      {group.items.length} event{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </td>
              </tr>,
              ...group.items.map((row, idx) => {
                const sno = startSno + idx;
                const evType = getEffectiveEventType(row);
                const status = getLogStatus(row);
                const isViol = row.review?.isViolation === true;
                const { label: evLabel, className: evCls } = eventMap[evType] || {
                  label: evType,
                  className: 'bg-gray-100 text-gray-600',
                  gradient: '',
                };
                const sc = statusConfig[status] || statusConfig.pending;
                const reviewMemberId = row.review?.reviewed ? (row.review.memberId ?? null) : (row.actor?.id ?? null);
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-gray-100 transition-colors ${
                      isViol
                        ? 'bg-red-50/40 hover:bg-red-50'
                        : !row.actor
                          ? 'bg-yellow-50/40 hover:bg-yellow-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-gray-400">{sno}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-700">{getLogTime(row)}</td>
                    <td className="px-4 py-3">{renderVideoCell(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evCls}`}>{evLabel}</span>
                    </td>
                    <td className="px-4 py-3">{renderIdentity(row)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {reviewMemberId ? (
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-600">
                          {reviewMemberId}
                        </span>
                      ) : (
                        <span className="rounded bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                          —
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {row.door?.name ?? '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.badgeCls}`}>
                          {sc.label}
                        </span>
                        {status === 'pending' ? (
                          <button
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${sc.btnCls}`}
                            type="button"
                            onClick={() => onReviewClick(row)}
                          >
                            Review
                          </button>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              className="rounded-lg border border-blue-300 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50"
                              type="button"
                              onClick={() => onViewClick(row)}
                            >
                              View
                            </button>
                            <button
                              className="rounded-lg border border-yellow-300 px-2.5 py-1 text-[11px] font-semibold text-yellow-700 transition hover:bg-yellow-50"
                              type="button"
                              onClick={() => onReviewClick(row)}
                            >
                              Edit
                            </button>
                          </div>
                        )}
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
            onClick={() => onPageChange(Math.max(0, page - 1))}
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
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllLogsTable;
