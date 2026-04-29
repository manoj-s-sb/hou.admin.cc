import { TailgateLog } from '../../../store/tailgate/types';
import { getEventDisplayType, getLogDate, getLogTime } from '../utils';

interface Actor {
  name: string | null;
  ini: string;
  ab: string;
  ac: string;
  actorType: string | null;
  incidents: TailgateLog[];
}

interface ViolationsTabProps {
  actors: Actor[];
}

const ViolationsTab = ({ actors }: ViolationsTabProps) => (
  <>
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <div>
        <p className="text-[13px] font-semibold text-red-800">Tailgate violations by member</p>
        <p className="mt-0.5 text-[11px] text-red-600">
          Stored in backend — all flagged violations are retained permanently and shown here regardless of log retention
          period.
        </p>
      </div>
    </div>

    {actors.length === 0 && <p className="py-10 text-center text-[13px] text-gray-400">No violations recorded.</p>}

    {actors.map((actor, ri) => (
      <div key={ri} className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
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
              {actor.actorType && <p className="text-[11px] text-gray-400">{actor.actorType}</p>}
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {['Date', 'Time', 'Event', 'Lane Door', 'Admin Note'].map(h => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actor.incidents.map(inc => (
              <tr key={inc.id} className="border-t border-gray-50 hover:bg-red-50/30">
                <td className="px-4 py-2.5 text-[12px] text-gray-700">{getLogDate(inc)}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-700">{getLogTime(inc)}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    ↩ {getEventDisplayType(inc.eventType)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {inc.door?.name ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{inc.review?.comment || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </>
);

export default ViolationsTab;
