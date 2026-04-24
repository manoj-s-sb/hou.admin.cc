import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../store/store';
import { fetchTailgateLogs, fetchTailgateStats } from '../../store/tailgate/api';
import { updateLogReview } from '../../store/tailgate/reducers';
import { TailgateLog, TailgateStatus } from '../../store/tailgate/types';

type TailgateTab = 'logs' | 'unid' | 'viol';

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const pages: (number | '...')[] = [];
  if (currentPage <= 3) {
    pages.push(0, 1, 2, 3, '...', totalPages - 2, totalPages - 1);
  } else if (currentPage >= totalPages - 4) {
    pages.push(0, 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
  } else {
    pages.push(0, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages - 1);
  }
  return pages;
}

const DEFAULT_FILTERS = { from: '', to: '', name: '', type: 'Tailgate', status: '', door: '' };

const statusConfig: Record<string, { label: string; badgeCls: string; btnCls: string; btnLabel: string }> = {
  reviewed:  {
    label: '✓ Reviewed',
    badgeCls: 'bg-green-100 text-green-700',
    btnCls:   'border border-green-300 text-green-700 hover:bg-green-50',
    btnLabel: 'Edit Review',
  },
  pending: {
    label: '⏳ Pending',
    badgeCls: 'bg-yellow-100 text-yellow-700',
    btnCls:   'bg-[#21295A] text-white hover:bg-[#1a2147]',
    btnLabel: 'Review',
  },
  violation: {
    label: '⚠ Violation',
    badgeCls: 'bg-red-100 text-red-700',
    btnCls:   'border border-red-300 text-red-700 hover:bg-red-50',
    btnLabel: 'Edit Review',
  },
};

const eventMap: Record<string, { label: string; className: string; gradient: string }> = {
  Entry:    { label: 'Entry',    className: 'bg-green-100 text-green-700',  gradient: 'linear-gradient(135deg,#1e3a5f,#2563eb)' },
  Exit:     { label: 'Exit',     className: 'bg-gray-100 text-gray-600',    gradient: 'linear-gradient(135deg,#1f2937,#4b5563)' },
  Tailgate: { label: 'Tailgate', className: 'bg-red-100 text-red-700',      gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
};

const TABLE_HEADERS = ['S.No', 'Time', 'Video', 'Event Type', 'Identity', 'Member ID', 'Lane Door', 'Status'];

/* ─── Review Modal ─────────────────────────────────────────────────────── */
interface ReviewModalProps {
  log: TailgateLog;
  onClose: () => void;
  onSave: (id: string, status: TailgateStatus, notes: string) => void;
}

const ReviewModal = ({ log, onClose, onSave }: ReviewModalProps) => {
  const [status, setStatus] = useState<TailgateStatus>(log.status === 'pending' ? 'reviewed' : log.status);
  const [notes, setNotes]   = useState(log.notes || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-[14px] font-bold text-[#21295A]">
              {log.status === 'pending' ? 'Write Review' : 'Edit Review'}
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
        <div className="space-y-4 p-5">
          {/* Radio-style status cards */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Set Status</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
                  status === 'reviewed'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
                type="button"
                onClick={() => setStatus('reviewed')}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${status === 'reviewed' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {status === 'reviewed' && <span className="text-[10px] font-bold text-white">✓</span>}
                </div>
                <p className="mt-1 text-[12px] font-bold text-gray-700">Reviewed</p>
                <p className="text-[10px] text-gray-400">No issue found</p>
              </button>
              <button
                className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
                  status === 'violation'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
                type="button"
                onClick={() => setStatus('violation')}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${status === 'violation' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                  {status === 'violation' && <span className="text-[10px] font-bold text-white">!</span>}
                </div>
                <p className="mt-1 text-[12px] font-bold text-gray-700">Violation</p>
                <p className="text-[10px] text-gray-400">Flag this member</p>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="rv-notes">
              Review Notes
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
              id="rv-notes"
              placeholder="Add notes about this entry…"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition ${
                status === 'violation' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#21295A] hover:bg-[#1a2147]'
              }`}
              type="button"
              onClick={() => { onSave(log.id, status, notes); onClose(); }}
            >
              Save Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Video Modal ───────────────────────────────────────────────────────── */
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
          <p className="text-[14px] font-bold text-[#21295A]">Video — {log.date}</p>
          <p className="text-[11px] text-gray-400">{log.t} · {log.gate}</p>
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
          <video controls className="w-full rounded-xl" src={log.videoUrl}>
            <track kind="captions" label="Captions" srcLang="en" />
          </video>
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

/* ─── Main Component ────────────────────────────────────────────────────── */
const Tailgate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, stats, isLoading } = useSelector((state: RootState) => state.tailgate);

  const [activeTab, setActiveTab]     = useState<TailgateTab>('logs');
  const [filters, setFilters]         = useState(DEFAULT_FILTERS);
  const [videoLog, setVideoLog]       = useState<TailgateLog | null>(null);
  const [reviewLog, setReviewLog]     = useState<TailgateLog | null>(null);
  const [timeSortDir, setTimeSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleFilterChange = (updater: (f: typeof filters) => typeof filters) => {
    setFilters(updater);
    setPage(0);
  };

  const handleSaveReview = (id: string, status: TailgateStatus, notes: string) => {
    dispatch(updateLogReview({ id, status, notes: notes.trim() || null }));
  };

  useEffect(() => {
    dispatch(fetchTailgateLogs());
    dispatch(fetchTailgateStats());
  }, [dispatch]);

  const pendingCount   = logs.filter(l => l.status === 'pending').length;
  const violationCount = logs.filter(l => l.viol).length;

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v !== '').length;

  const filteredLogs = logs.filter(l => {
    if (filters.from && l.dateVal < filters.from) return false;
    if (filters.to && l.dateVal > filters.to) return false;
    if (filters.name && !(l.name || '').toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.type && l.ev !== filters.type) return false;
    if (filters.status && l.status !== filters.status) return false;
    if (filters.door && l.gate !== filters.door) return false;
    return true;
  });

  const groupedLogs = filteredLogs.reduce<Record<string, { date: string; items: TailgateLog[] }>>(
    (acc, l) => {
      if (!acc[l.dateVal]) acc[l.dateVal] = { date: l.date, items: [] };
      acc[l.dateVal].items.push(l);
      return acc;
    },
    {}
  );
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
  sortedDates.forEach(d => {
    groupedLogs[d].items.sort((a, b) => {
      const cmp = a.t.localeCompare(b.t);
      return timeSortDir === 'asc' ? cmp : -cmp;
    });
  });

  // Flatten all rows for pagination, then re-group the current page's slice
  const flatItems = sortedDates.flatMap(d => groupedLogs[d].items.map(item => ({ dateVal: d, date: groupedLogs[d].date, item })));
  const totalRows  = flatItems.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const pageSlice  = flatItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pagedGroups = pageSlice.reduce<Record<string, { date: string; items: TailgateLog[] }>>((acc, { dateVal, date, item }) => {
    if (!acc[dateVal]) acc[dateVal] = { date, items: [] };
    acc[dateVal].items.push(item);
    return acc;
  }, {});
  const pagedDates = Array.from(new Set(pageSlice.map(r => r.dateVal)));
  const pageNumbers = getPageNumbers(page, totalPages);

  const pendingLogs   = logs.filter(l => l.status === 'pending').sort((a, b) => a.dateVal.localeCompare(b.dateVal));
  const violationLogs = logs.filter(l => l.viol);

  const byActor: Record<string, { name: string | null; ini: string; ab: string; ac: string; actorType: string | null; incidents: TailgateLog[] }> = {};
  violationLogs.forEach(l => {
    const k = l.actorId || '__unknown__';
    if (!byActor[k]) byActor[k] = { name: l.name, ini: l.ini, ab: l.ab, ac: l.ac, actorType: l.actorType, incidents: [] };
    byActor[k].incidents.push(l);
  });
  const actors = Object.values(byActor).sort((a, b) => b.incidents.length - a.incidents.length);

  const tabs: { key: TailgateTab; label: string; badge?: number; badgeCls?: string }[] = [
    { key: 'logs', label: 'All Logs' },
    { key: 'unid', label: 'Unidentified', badge: pendingCount,   badgeCls: 'bg-yellow-500' },
    { key: 'viol', label: 'Violations',   badge: violationCount, badgeCls: 'bg-red-500' },
  ];

  const renderIdentity = (row: TailgateLog) =>
    row.name ? (
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: row.ab, color: row.ac }}
        >
          {row.ini}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#21295A]">{row.name}</p>
          {row.actorType && <p className="text-[11px] text-gray-400">{row.actorType}</p>}
        </div>
      </div>
    ) : (
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

  const renderVideoCell = (row: TailgateLog) => {
    const grad = (eventMap[row.ev] || eventMap.Entry).gradient;
    return (
      <button
        className="flex flex-col items-center gap-1"
        type="button"
        onClick={() => setVideoLog(row)}
      >
        <div
          className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-lg"
          style={{ background: grad }}
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
    );
  };

  return (
    <div className="w-full max-w-full">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Tailgate Logs</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Date-wise video logs · Review unidentified entries · Flag violations
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`relative flex items-center gap-1.5 px-5 pb-3.5 pt-4 text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'font-semibold text-[#21295A]'
                    : 'font-medium text-gray-400 hover:text-gray-600'
                }`}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tab.badgeCls}`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 h-[2.5px] w-full rounded-full bg-[#21295A]" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── All Logs ───────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <>
              {/* Stats cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  {
                    label: "Today's Events", value: stats.today_total, sub: stats.today_date,
                    color: 'text-[#21295A]', border: 'border-l-4 border-l-[#21295A]',
                    icon: (
                      <svg className="h-4 w-4 text-[#21295A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                    ),
                  },
                  {
                    label: 'Entries', value: stats.today_entries, sub: 'Lane door entries',
                    color: 'text-green-600', border: 'border-l-4 border-l-green-400',
                    icon: (
                      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                    ),
                  },
                  {
                    label: 'Tailgates', value: stats.today_tailgates, sub: 'Detected today',
                    color: 'text-red-600', border: 'border-l-4 border-l-red-400',
                    icon: (
                      <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                    ),
                  },
                  {
                    label: 'Unidentified', value: stats.total_unidentified, sub: 'Across all dates',
                    color: 'text-yellow-600', border: 'border-l-4 border-l-yellow-400',
                    icon: (
                      <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                    ),
                  },
                  {
                    label: 'Violations', value: stats.total_violations, sub: 'All time',
                    color: 'text-red-600', border: 'border-l-4 border-l-red-600',
                    icon: (
                      <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                    ),
                  },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 ${s.border}`}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {s.icon}
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                    </div>
                    <p className={`text-[26px] font-bold leading-none ${s.color}`}>{s.value ?? '—'}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                      </svg>
                      <span className="text-[12px] font-semibold text-gray-500">Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#21295A] px-1.5 text-[10px] font-bold text-white">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <button
                      className="rounded-lg border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-[#21295A]"
                      type="button"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-from">
                        From Date
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-from"
                        type="date"
                        value={filters.from}
                        onChange={e => handleFilterChange(f => ({ ...f, from: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-to">
                        To Date
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-to"
                        type="date"
                        value={filters.to}
                        onChange={e => handleFilterChange(f => ({ ...f, to: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-name">
                        Member / Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-name"
                        placeholder="Search…"
                        type="text"
                        value={filters.name}
                        onChange={e => handleFilterChange(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-type">
                        Event Type
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-type"
                        value={filters.type}
                        onChange={e => handleFilterChange(f => ({ ...f, type: e.target.value }))}
                      >
                        <option value="">All</option>
                        <option value="Entry">Entry</option>
                        <option value="Exit">Exit</option>
                        <option value="Tailgate">Tailgate</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-status">
                        Review Status
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-status"
                        value={filters.status}
                        onChange={e => handleFilterChange(f => ({ ...f, status: e.target.value }))}
                      >
                        <option value="">All</option>
                        <option value="pending">Pending Review</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="violation">Violation</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400" htmlFor="tg-door">
                        Lane Door
                      </label>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                        id="tg-door"
                        value={filters.door}
                        onChange={e => handleFilterChange(f => ({ ...f, door: e.target.value }))}
                      >
                        <option value="">All</option>
                        <option value="Door Lane">Door Lane</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grouped Table */}
              {isLoading ? (
                <div className="py-10 text-center text-[13px] text-gray-400">Loading…</div>
              ) : totalRows === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">No logs found. Try adjusting your filters.</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {TABLE_HEADERS.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                            {h === 'Time' ? (
                              <button
                                className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-[#21295A]"
                                type="button"
                                onClick={() => setTimeSortDir(d => d === 'asc' ? 'desc' : 'asc')}
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
                      {pagedDates.map(dateVal => {
                        const group = pagedGroups[dateVal];
                        return [
                          <tr key={`date-${dateVal}`} className="border-l-4 border-l-[#21295A] bg-[#21295A]/[0.06]">
                            <td className="px-4 py-2.5" colSpan={TABLE_HEADERS.length}>
                              <div className="flex items-center gap-3">
                                <svg className="h-3.5 w-3.5 flex-shrink-0 text-[#21295A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
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
                            const { label: evLabel, className: evCls } = eventMap[row.ev] || { label: row.ev, className: 'bg-gray-100 text-gray-600', gradient: '' };
                            const sc = statusConfig[row.status] || statusConfig.pending;
                            return (
                              <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 text-[13px] font-medium text-gray-400 whitespace-nowrap">{idx + 1}</td>
                                <td className="px-4 py-3 text-[13px] text-gray-700 whitespace-nowrap">{row.t}</td>
                                <td className="px-4 py-3">{renderVideoCell(row)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evCls}`}>{evLabel}</span>
                                </td>
                                <td className="px-4 py-3">{renderIdentity(row)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {row.memberId
                                    ? <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-600">{row.memberId}</span>
                                    : <span className="rounded bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">—</span>
                                  }
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{row.gate}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sc.badgeCls}`}>{sc.label}</span>
                                    <button
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${sc.btnCls}`}
                                      type="button"
                                      onClick={() => setReviewLog(row)}
                                    >
                                      {sc.btnLabel}
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

                  {/* Pagination footer — same theme as DataTable */}
                  <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Rows per page:</span>
                      <select
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
                        value={rowsPerPage}
                        onChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
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
                        onClick={() => setPage(p => Math.max(0, p - 1))}
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
                              onClick={() => setPage(p as number)}
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
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Unidentified ───────────────────────────────────── */}
          {activeTab === 'unid' && (
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
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
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
                      const { label: evLabel, className: evCls } = eventMap[row.ev] || { label: row.ev, className: 'bg-gray-100 text-gray-600', gradient: '' };
                      return (
                        <tr key={row.id} className="border-t border-gray-100 bg-yellow-50/30 hover:bg-yellow-50">
                          <td className="px-4 py-3 text-[13px] font-medium text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-[#21295A]">{row.date}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ageCls}`}>{ageLabel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-gray-700 whitespace-nowrap">{row.t}</td>
                          <td className="px-4 py-3">{renderVideoCell(row)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evCls}`}>{evLabel}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{row.gate}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Violations ─────────────────────────────────────── */}
          {activeTab === 'viol' && (
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
                    Stored in backend — all flagged violations are retained permanently and shown here regardless of log retention period.
                  </p>
                </div>
              </div>

              {actors.length === 0 && (
                <p className="py-10 text-center text-[13px] text-gray-400">No violations recorded.</p>
              )}

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
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                      </svg>
                      {actor.incidents.length} Violation{actor.incidents.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {['Date', 'Time', 'Event', 'Lane Door', 'Admin Note'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actor.incidents.map(inc => (
                        <tr key={inc.id} className="border-t border-gray-50 hover:bg-red-50/30">
                          <td className="px-4 py-2.5 text-[12px] text-gray-700">{inc.date}</td>
                          <td className="px-4 py-2.5 text-[12px] text-gray-700">{inc.t}</td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">↩ {inc.ev}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{inc.gate}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-gray-500">{inc.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Video Modal ──────────────────────────────────────── */}
      {videoLog && <VideoModal log={videoLog} onClose={() => setVideoLog(null)} />}

      {/* ── Review Modal ─────────────────────────────────────── */}
      {reviewLog && (
        <ReviewModal
          log={reviewLog}
          onClose={() => setReviewLog(null)}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
};

export default Tailgate;
