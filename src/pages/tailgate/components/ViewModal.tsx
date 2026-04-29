import { TailgateLog, TailgateStatus } from '../../../store/tailgate/types';
import { statusConfig } from '../constants';

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
  const sc = statusConfig[log.status as TailgateStatus] || statusConfig.pending;

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
              {log.name ? `${log.name} – Log Detail` : 'Log Detail'}
            </p>
            <p className="text-[11px] text-gray-400">{log.date} · {log.t} · {log.gate}</p>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Video / Snapshot */}
          {log.videoUrl ? (
            <video className="w-full rounded-xl" controls preload="metadata" src={log.videoUrl}>
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
            <MetaCell label="Member">{log.personName || log.name || '—'}</MetaCell>
            <MetaCell label="Member ID">
              {log.personMemberId || log.memberId
                ? <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[12px]">{log.personMemberId || log.memberId}</span>
                : '—'}
            </MetaCell>
            <MetaCell label="Event">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{log.ev}</span>
            </MetaCell>
            <MetaCell label="Time">{log.t}</MetaCell>
            <MetaCell label="Lane Door">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{log.gate}</span>
            </MetaCell>
            <MetaCell label="Date">{log.date}</MetaCell>
            <MetaCell label="Status">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.badgeCls}`}>{sc.label}</span>
            </MetaCell>
            <MetaCell label="Persons">{log.personCount ?? '—'}</MetaCell>
          </div>

          {/* Admin notes if present */}
          {log.notes && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin Notes</p>
              <p className="text-[13px] text-gray-700">{log.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewModal;
