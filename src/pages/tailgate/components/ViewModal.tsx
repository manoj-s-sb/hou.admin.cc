import { TailgateLog } from '../../../store/tailgate/types';
import { statusConfig } from '../constants';
import { getEffectiveEventType, getEffectiveName, getLogDate, getLogStatus, getLogTime } from '../utils';

interface ViewModalProps {
  log: TailgateLog;
  onClose: () => void;
}

const MetaCell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
    <div className="text-[13px] font-semibold text-[#21295A]">{children}</div>
  </div>
);

const ViewModal = ({ log, onClose }: ViewModalProps) => {
  const status = getLogStatus(log);
  const sc = statusConfig[status] || statusConfig.pending;
  const memberName = getEffectiveName(log);
  const memberId = log.review?.reviewed ? (log.review.memberId ?? null) : (log.actor?.id ?? null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[14px] font-bold text-[#21295A]">
              {memberName ? `${memberName} – Log Detail` : 'Log Detail'}
            </p>
            <p className="text-[11px] text-gray-400">
              {getLogDate(log)} · {getLogTime(log)} · {log.door?.name ?? '—'}
            </p>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Video / Snapshot */}
          {log.videoUrl ? (
            <video controls controlsList="nodownload" className="w-full rounded-xl" preload="metadata" src={log.videoUrl}>
              <track kind="captions" label="Captions" srcLang="en" />
            </video>
          ) : log.snapshotUrl ? (
            <img alt="Event snapshot" className="w-full rounded-xl object-cover" src={log.snapshotUrl} />
          ) : (
            <div className="flex h-44 items-center justify-center rounded-xl bg-[#1a2340]">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                  <svg className="h-5 w-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-[11px] text-white/50">No video available</p>
              </div>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-4">
            <MetaCell label="Member">{memberName || '—'}</MetaCell>
            <MetaCell label="Member ID">
              {memberId ? (
                <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[12px]">{memberId}</span>
              ) : (
                '—'
              )}
            </MetaCell>
            <MetaCell label="Event">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {getEffectiveEventType(log)}
              </span>
            </MetaCell>
            <MetaCell label="Time">{getLogTime(log)}</MetaCell>
            <MetaCell label="Lane Door">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {log.door?.name ?? '—'}
              </span>
            </MetaCell>
            <MetaCell label="Date">{getLogDate(log)}</MetaCell>
            <MetaCell label="Status">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.badgeCls}`}>{sc.label}</span>
            </MetaCell>
            <MetaCell label="Persons">{log.detection?.personCount ?? '—'}</MetaCell>
          </div>

          {/* Admin notes if present */}
          {log.review?.comment && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin Notes</p>
              <p className="text-[13px] text-gray-700">{log.review.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewModal;
