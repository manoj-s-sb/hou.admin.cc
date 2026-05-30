import { useEffect, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '../../store/store';
import { fetchTailgateEvents, fetchTailgateStats } from '../../store/tailgate/api';
import { TailgateLog } from '../../store/tailgate/types';

import AllLogsTable from './components/AllLogsTable';
import LogFilters from './components/LogFilters';
import ReviewModal from './components/ReviewModal';
import StatsCards from './components/StatsCards';
import Toast from './components/Toast';
import UnidentifiedTab from './components/UnidentifiedTab';
import VideoModal from './components/VideoModal';
import ViewModal from './components/ViewModal';
import ViolationsTab from './components/ViolationsTab';
import { DEFAULT_FILTERS, TailgateFilters } from './constants';
import { getAvatarData, getEffectiveEventType, getLogDate, getLogDateVal, getLogStatus } from './utils';

type TailgateTab = 'logs' | 'unid' | 'viol';

const FACILITY_TZ = 'America/Chicago';

const toApiDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

const Tailgate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { logs, isLoading, stats } = useSelector((state: RootState) => state.tailgate);

  const [activeTab, setActiveTab] = useState<TailgateTab>('logs');
  const [filters, setFilters] = useState<TailgateFilters>(DEFAULT_FILTERS);
  const [videoLog, setVideoLog] = useState<TailgateLog | null>(null);
  const [reviewLog, setReviewLog] = useState<TailgateLog | null>(null);
  const [viewLog, setViewLog] = useState<TailgateLog | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [timeSortDir, setTimeSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const silentRefresh = useRef(false);

  const handleFilterChange = (updater: (f: TailgateFilters) => TailgateFilters) => {
    setFilters(updater);
    setPage(0);
  };

  const handleSaveReview = (isViolation: boolean) => {
    setToast(
      isViolation
        ? { message: 'Violation flagged and saved', type: 'danger' }
        : { message: 'Review saved successfully', type: 'success' }
    );
    silentRefresh.current = true;
    const payload: Parameters<typeof fetchTailgateEvents>[0] = {};
    if (filters.from) payload.fromDate = toApiDate(filters.from);
    if (filters.to) payload.toDate = toApiDate(filters.to);
    if (filters.name) payload.memberName = filters.name;
    if (filters.door) payload.laneDoor = filters.door;
    dispatch(fetchTailgateEvents(payload)).finally(() => { silentRefresh.current = false; });
    dispatch(fetchTailgateStats());
  };

  useEffect(() => {
    dispatch(fetchTailgateStats());
  }, [dispatch]);

  useEffect(() => {
    const payload: Parameters<typeof fetchTailgateEvents>[0] = {};
    if (filters.from) payload.fromDate = toApiDate(filters.from);
    if (filters.to) payload.toDate = toApiDate(filters.to);
    if (filters.name) payload.memberName = filters.name;
    if (filters.door) payload.laneDoor = filters.door;
    dispatch(fetchTailgateEvents(payload));
  }, [dispatch, filters.from, filters.to, filters.name, filters.door]);

  const apiStats = {
    today_date: new Date().toLocaleDateString('en-US', {
      timeZone: FACILITY_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    today_total: stats?.todayTotal ?? 0,
    today_entries: stats?.todayEntries ?? 0,
    today_tailgates: stats?.todayTailgates ?? 0,
    total_unidentified: stats?.totalUnidentified ?? 0,
    total_violations: stats?.totalViolations ?? 0,
  };

  const pendingCount = logs.filter(l => !l.actor?.name && !l.review?.memberName).length;
  const violationCount = logs.filter(l => l.review?.isViolation === true).length;
  const activeFilterCount = Object.entries(filters).filter(([, v]) => v !== '').length;

  const filteredLogs = logs.filter(l => {
    const displayName = l.review?.reviewed ? (l.review.memberName ?? '') : (l.actor?.name ?? '');
    if (filters.name && !displayName.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.type && getEffectiveEventType(l) !== filters.type) return false;
    if (filters.status && getLogStatus(l) !== filters.status) return false;
    if (filters.door && l.door?.name !== filters.door) return false;
    return true;
  });

  // Group + sort by date and time
  const groupedLogs = filteredLogs.reduce<Record<string, { date: string; items: TailgateLog[] }>>((acc, l) => {
    const dv = getLogDateVal(l);
    if (!acc[dv]) acc[dv] = { date: getLogDate(l), items: [] };
    acc[dv].items.push(l);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
  sortedDates.forEach(d => {
    groupedLogs[d].items.sort((a, b) => {
      const cmp = a.timeStampms - b.timeStampms;
      return timeSortDir === 'asc' ? cmp : -cmp;
    });
  });

  // Paginate
  const flatItems = sortedDates.flatMap(d =>
    groupedLogs[d].items.map(item => ({ dateVal: d, date: groupedLogs[d].date, item }))
  );
  const totalRows = flatItems.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const pageSlice = flatItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pagedGroups = pageSlice.reduce<Record<string, { date: string; items: TailgateLog[] }>>(
    (acc, { dateVal, date, item }) => {
      if (!acc[dateVal]) acc[dateVal] = { date, items: [] };
      acc[dateVal].items.push(item);
      return acc;
    },
    {}
  );
  const pagedDates = Array.from(new Set(pageSlice.map(r => r.dateVal)));

  const groupStartIndex: Record<string, number> = {};
  pagedDates.forEach(d => {
    const firstItem = pagedGroups[d]?.items[0];
    if (firstItem) groupStartIndex[d] = groupedLogs[d].items.indexOf(firstItem);
  });

  // Unidentified tab data
  const pendingLogs = logs
    .filter(l => !l.actor?.name && !l.review?.memberName)
    .sort((a, b) => getLogDateVal(b).localeCompare(getLogDateVal(a)));

  // Violations tab data
  const byActor: Record<
    string,
    {
      name: string | null;
      memberId: string | null;
      ini: string;
      ab: string;
      ac: string;
      actorType: string | null;
      incidents: TailgateLog[];
    }
  > = {};
  logs
    .filter(l => l.review?.isViolation === true)
    .forEach(l => {
      const isReviewed = l.review?.reviewed === true;
      const displayName = isReviewed ? (l.review?.memberName ?? null) : (l.actor?.name ?? null);
      const displayId = isReviewed ? (l.review?.memberId ?? null) : (l.actor?.id ?? null);
      const k = isReviewed
        ? l.review?.memberId || `__rev__${l.review?.memberName ?? ''}`
        : l.actor?.id || '__unknown__';
      if (!byActor[k]) {
        const { ini, ab, ac } = getAvatarData(displayName);
        byActor[k] = {
          name: displayName,
          memberId: displayId,
          ini,
          ab,
          ac,
          actorType: l.actor?.type ?? null,
          incidents: [],
        };
      }
      byActor[k].incidents.push(l);
    });
  const actors = Object.values(byActor).sort((a, b) => b.incidents.length - a.incidents.length);

  const tabs: { key: TailgateTab; label: string; badge?: number; badgeCls?: string }[] = [
    { key: 'logs', label: 'All Logs' },
    { key: 'unid', label: 'Unidentified', badge: pendingCount, badgeCls: 'bg-yellow-500' },
    { key: 'viol', label: 'Violations', badge: violationCount, badgeCls: 'bg-red-500' },
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
                  activeTab === tab.key
                    ? 'font-semibold text-[#21295A]'
                    : 'font-medium text-gray-400 hover:text-gray-600'
                }`}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tab.badgeCls}`}
                  >
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
              <StatsCards {...apiStats} />
              <LogFilters
                activeFilterCount={activeFilterCount}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={() => {
                  setFilters(DEFAULT_FILTERS);
                  setPage(0);
                }}
              />
              {isLoading && !silentRefresh.current ? (
                <div className="py-10 text-center text-[13px] text-gray-400">Loading…</div>
              ) : totalRows === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">
                  No logs found. Try adjusting your filters.
                </div>
              ) : (
                <AllLogsTable
                  groupStartIndex={groupStartIndex}
                  page={page}
                  pagedDates={pagedDates}
                  pagedGroups={pagedGroups}
                  rowsPerPage={rowsPerPage}
                  timeSortDir={timeSortDir}
                  totalPages={totalPages}
                  totalRows={totalRows}
                  onPageChange={setPage}
                  onReviewClick={setReviewLog}
                  onRowsPerPageChange={n => {
                    setRowsPerPage(n);
                    setPage(0);
                  }}
                  onTimeSortToggle={() => setTimeSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                  onVideoClick={setVideoLog}
                  onViewClick={setViewLog}
                />
              )}
            </>
          )}

          {/* Unidentified tab */}
          {activeTab === 'unid' && (
            <UnidentifiedTab
              pendingLogs={pendingLogs}
              onReviewClick={setReviewLog}
              onVideoClick={setVideoLog}
              onViewClick={setViewLog}
            />
          )}

          {/* Violations tab */}
          {activeTab === 'viol' && <ViolationsTab actors={actors} onVideoClick={setVideoLog} />}
        </div>
      </div>

      {videoLog && <VideoModal log={videoLog} onClose={() => setVideoLog(null)} />}
      {viewLog && <ViewModal log={viewLog} onClose={() => setViewLog(null)} />}
      {reviewLog && <ReviewModal log={reviewLog} onClose={() => setReviewLog(null)} onSave={handleSaveReview} />}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
};

export default Tailgate;
