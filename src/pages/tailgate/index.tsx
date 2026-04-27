import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../store/store';
import { fetchTailgateLogs, fetchTailgateStats } from '../../store/tailgate/api';
import { updateLogReview } from '../../store/tailgate/reducers';
import { TailgateLog, TailgateStatus } from '../../store/tailgate/types';

import AllLogsTable from './components/AllLogsTable';
import LogFilters from './components/LogFilters';
import ReviewModal from './components/ReviewModal';
import StatsCards from './components/StatsCards';
import UnidentifiedTab from './components/UnidentifiedTab';
import VideoModal from './components/VideoModal';
import ViolationsTab from './components/ViolationsTab';
import { DEFAULT_FILTERS, TailgateFilters } from './constants';

type TailgateTab = 'logs' | 'unid' | 'viol';

const Tailgate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, stats, isLoading } = useSelector((state: RootState) => state.tailgate);

  const [activeTab, setActiveTab]     = useState<TailgateTab>('logs');
  const [filters, setFilters]         = useState<TailgateFilters>(DEFAULT_FILTERS);
  const [videoLog, setVideoLog]       = useState<TailgateLog | null>(null);
  const [reviewLog, setReviewLog]     = useState<TailgateLog | null>(null);
  const [timeSortDir, setTimeSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleFilterChange = (updater: (f: TailgateFilters) => TailgateFilters) => {
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

  // Filter
  const filteredLogs = logs.filter(l => {
    if (filters.from && l.dateVal < filters.from) return false;
    if (filters.to && l.dateVal > filters.to) return false;
    if (filters.name && !(l.name || '').toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.type && l.ev !== filters.type) return false;
    if (filters.status && l.status !== filters.status) return false;
    if (filters.door && l.gate !== filters.door) return false;
    return true;
  });

  // Group + sort by date and time
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

  // Paginate
  const flatItems  = sortedDates.flatMap(d => groupedLogs[d].items.map(item => ({ dateVal: d, date: groupedLogs[d].date, item })));
  const totalRows  = flatItems.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const pageSlice  = flatItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pagedGroups = pageSlice.reduce<Record<string, { date: string; items: TailgateLog[] }>>((acc, { dateVal, date, item }) => {
    if (!acc[dateVal]) acc[dateVal] = { date, items: [] };
    acc[dateVal].items.push(item);
    return acc;
  }, {});
  const pagedDates = Array.from(new Set(pageSlice.map(r => r.dateVal)));

  // Unidentified tab data
  const pendingLogs = logs.filter(l => l.status === 'pending').sort((a, b) => a.dateVal.localeCompare(b.dateVal));

  // Violations tab data
  const byActor: Record<string, { name: string | null; ini: string; ab: string; ac: string; actorType: string | null; incidents: TailgateLog[] }> = {};
  logs.filter(l => l.viol).forEach(l => {
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

  return (
    <div className="w-full max-w-full">
      {/* Page Header */}
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Tailgate Logs</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Date-wise video logs · Review unidentified entries · Flag violations
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`relative flex items-center gap-1.5 px-5 pb-3.5 pt-4 text-sm transition-colors ${
                  activeTab === tab.key ? 'font-semibold text-[#21295A]' : 'font-medium text-gray-400 hover:text-gray-600'
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
          {/* All Logs tab */}
          {activeTab === 'logs' && (
            <>
              <StatsCards stats={stats} />
              <LogFilters
                activeFilterCount={activeFilterCount}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={() => { setFilters(DEFAULT_FILTERS); setPage(0); }}
              />
              {isLoading ? (
                <div className="py-10 text-center text-[13px] text-gray-400">Loading…</div>
              ) : totalRows === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">No logs found. Try adjusting your filters.</div>
              ) : (
                <AllLogsTable
                  page={page}
                  pagedDates={pagedDates}
                  pagedGroups={pagedGroups}
                  rowsPerPage={rowsPerPage}
                  timeSortDir={timeSortDir}
                  totalPages={totalPages}
                  totalRows={totalRows}
                  onPageChange={setPage}
                  onReviewClick={setReviewLog}
                  onRowsPerPageChange={n => { setRowsPerPage(n); setPage(0); }}
                  onTimeSortToggle={() => setTimeSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  onVideoClick={setVideoLog}
                />
              )}
            </>
          )}

          {/* Unidentified tab */}
          {activeTab === 'unid' && (
            <UnidentifiedTab pendingLogs={pendingLogs} onVideoClick={setVideoLog} />
          )}

          {/* Violations tab */}
          {activeTab === 'viol' && (
            <ViolationsTab actors={actors} />
          )}
        </div>
      </div>

      {videoLog && <VideoModal log={videoLog} onClose={() => setVideoLog(null)} />}
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
