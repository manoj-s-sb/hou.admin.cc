import { TailgateLog } from '../../../store/tailgate/types';
import { eventMap } from '../constants';

interface UnidentifiedTabProps {
  pendingLogs: TailgateLog[];
  onVideoClick: (row: TailgateLog) => void;
}

const UnidentifiedTab = ({ pendingLogs, onVideoClick }: UnidentifiedTabProps) => (
  <>
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
      <div>
        <p className="text-[13px] font-semibold text-yellow-800">All pending entries — across all dates</p>
        <p className="mt-0.5 text-[11px] text-yellow-600">
          These entries could not be matched to a member and are still awaiting review. Oldest entries shown first.
        </p>
      </div>
    </div>
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {['S.No', 'Date', 'Time', 'Video', 'Event Type', 'Lane Door'].map(h => (
              <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pendingLogs.length === 0 && (
            <tr>
              <td className="py-10 text-center text-[13px] text-gray-400" colSpan={6}>No pending entries.</td>
            </tr>
          )}
          {pendingLogs.map((row, idx) => {
            const todayVal = new Date().toISOString().slice(0, 10);
            const dayDiff  = Math.round((new Date(todayVal).getTime() - new Date(row.dateVal).getTime()) / (1000 * 60 * 60 * 24));
            const ageCls   = dayDiff === 0 ? 'bg-green-100 text-green-700' : dayDiff === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
            const ageLabel = dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Yesterday' : `${dayDiff}d old`;
            const { label: evLabel, className: evCls, gradient } = eventMap[row.ev] || { label: row.ev, className: 'bg-gray-100 text-gray-600', gradient: 'linear-gradient(135deg,#1f2937,#4b5563)' };
            return (
              <tr key={row.id} className="border-t border-gray-100 bg-yellow-50/30 hover:bg-yellow-50">
                <td className="px-4 py-3 text-[13px] font-medium text-gray-400">{idx + 1}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#21295A]">{row.date}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ageCls}`}>{ageLabel}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-700">{row.t}</td>
                <td className="px-4 py-3">
                  <button className="flex flex-col items-center gap-1" type="button" onClick={() => onVideoClick(row)}>
                    <div
                      className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-lg"
                      style={{ background: gradient }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
                          <svg className="ml-0.5 h-2.5 w-2.5 text-[#21295A]" fill="currentColor" viewBox="0 0 10 12">
                            <polygon points="1,0 9,6 1,12" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">{row.tr}</span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evCls}`}>{evLabel}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{row.gate}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

export default UnidentifiedTab;
