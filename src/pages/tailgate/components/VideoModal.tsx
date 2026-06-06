import { TailgateLog } from '../../../store/tailgate/types';
import { getLogDate, getLogTime } from '../utils';

interface VideoModalProps {
  log: TailgateLog;
  onClose: () => void;
}

const VideoModal = ({ log, onClose }: VideoModalProps) => (
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
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-[14px] font-bold text-[#21295A]">Video — {getLogDate(log)}</p>
          <p className="text-[11px] text-gray-400">
            {getLogTime(log)} · {log.door?.name ?? '—'}
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
      <div className="p-5">
        {log.videoUrl ? (
          <video controls controlsList="nodownload" className="w-full rounded-xl" preload="metadata" src={log.videoUrl}>
            <track kind="captions" label="Captions" srcLang="en" />
          </video>
        ) : log.snapshotUrl ? (
          <img alt="Event snapshot" className="w-full rounded-xl object-cover" src={log.snapshotUrl} />
        ) : (
          <div className="flex h-52 items-center justify-center rounded-xl bg-[#1a2340]">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-white/10">
                <svg className="h-5 w-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-[12px] text-white/50">Video not available yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default VideoModal;
