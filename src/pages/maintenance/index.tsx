import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import endpoints from '../../constants/endpoints';
import api from '../../services';
import { getWorkList, updateWork } from '../../store/maintenance/api';
import { Work } from '../../store/maintenance/types';
import { AppDispatch, RootState } from '../../store/store';

import AddTaskModal from './components/AddTaskModal';
import FlagIssueModal from './components/FlagIssueModal';
import IssueCard from './components/IssueCard';
import IssueDetailModal from './components/IssueDetailModal';
import MarkDoneModal from './components/MarkDoneModal';
import ScheduleCard from './components/ScheduleCard';
import ScheduleModal from './components/ScheduleModal';
import StepsModal from './components/StepsModal';
import TaskCard from './components/TaskCard';
import { FACILITY_CODE, Tab, TaskFrequency, getLocalUser, tabs, taskFrequencies } from './constants';

const Maintenance = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workList, isLoading } = useSelector((state: RootState) => state.maintenance);
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.userId || '';
    } catch {
      return '';
    }
  })();

  const toDateStr = (d: Date) => d.toISOString().split('T')[0];
  const today = toDateStr(new Date());
  const sevenDaysLater = toDateStr(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));

  const [activeTab, setActiveTab] = useState<Tab>('task');
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency>('weekly');
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(today);
  const [allScheduleItems, setAllScheduleItems] = useState<Work[]>([]);
  const [selectedItem, setSelectedItem] = useState<Work | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<Work | null>(null);
  const [markDoneItem, setMarkDoneItem] = useState<Work | null>(null);
  const [flagIssueItem, setFlagIssueItem] = useState<Work | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [issueCount, setIssueCount] = useState<number | null>(null);
  const [viewIssue, setViewIssue] = useState<{ item: Work; index: number } | null>(null);

  const fetchList = (
    type: Tab,
    frequency: TaskFrequency,
    page = 1,
    limit = workList.limit || 20,
    lane = selectedLane
  ) => {
    dispatch(
      getWorkList({
        facilityCode: FACILITY_CODE,
        page,
        limit,
        type,
        ...(type === 'task' && { frequency, laneNo: lane }),
      })
    );
  };

  // Non-schedule tabs: re-fetch on filter change
  useEffect(() => {
    if (activeTab !== 'schedule') {
      fetchList(activeTab, taskFrequency, 1, workList.limit || 20, selectedLane);
    } else if (selectedScheduleDate === 'overdue') {
      const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      dispatch(getWorkList({ facilityCode: FACILITY_CODE, page: 1, limit: 100, type: 'task', toDate: yesterday }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, taskFrequency, selectedLane, selectedScheduleDate]);

  // Fetch issue count on mount without touching Redux workList state
  useEffect(() => {
    api
      .post(endpoints.maintenance.workList, { facilityCode: FACILITY_CODE, page: 1, limit: 1, type: 'issue' })
      .then((res: any) => {
        const data = res.data?.data;
        const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
        setIssueCount(total);
      });
  }, []);

  // Keep issue count in sync whenever issue tab data refreshes
  useEffect(() => {
    if (activeTab === 'issue') setIssueCount(workList.total);
  }, [activeTab, workList.total]);

  // Schedule tab: fetch full 7-day range once, filter client-side
  useEffect(() => {
    if (activeTab === 'schedule') {
      dispatch(
        getWorkList({
          facilityCode: FACILITY_CODE,
          page: 1,
          limit: 100,
          type: 'task',
          fromDate: today,
          toDate: sevenDaysLater,
        })
      ).then((result: any) => {
        const data = result.payload?.data;
        setAllScheduleItems(Array.isArray(data) ? data : data?.items || []);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const scheduleCountByDate = allScheduleItems.reduce<Record<string, number>>((acc, item) => {
    if (item.scheduledDate) acc[item.scheduledDate] = (acc[item.scheduledDate] || 0) + 1;
    return acc;
  }, {});

  const scheduleDisplayItems =
    selectedScheduleDate === 'overdue'
      ? workList.items || []
      : allScheduleItems.filter(item => item.scheduledDate === selectedScheduleDate);

  const refreshSchedule = () => {
    if (selectedScheduleDate === 'overdue') {
      const yesterday = toDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      dispatch(getWorkList({ facilityCode: FACILITY_CODE, page: 1, limit: 100, type: 'task', toDate: yesterday }));
    } else {
      dispatch(
        getWorkList({
          facilityCode: FACILITY_CODE,
          page: 1,
          limit: 100,
          type: 'task',
          fromDate: today,
          toDate: sevenDaysLater,
        })
      ).then((result: any) => {
        const data = result.payload?.data;
        setAllScheduleItems(Array.isArray(data) ? data : data?.items || []);
      });
    }
  };

  const onSuccess = () =>
    activeTab === 'schedule' ? refreshSchedule() : fetchList(activeTab, taskFrequency, workList.page || 1);

  const handleUndo = (item: Work) => {
    const { name: updatedByName } = getLocalUser();
    dispatch(updateWork({
      itemId: item.itemId,
      status: 'pending',
      ...(currentUserId ? { updatedBy: currentUserId } : {}),
      ...(updatedByName ? { updatedByName } : {}),
    }))
      .unwrap()
      .then(() => {
        toast.success('Issue undone — task set back to pending.');
        refreshSchedule();
      })
      .catch((err: any) => toast.error(err || 'Failed to undo.'));
  };

  // ─── Column definitions ───────────────────────────────────────────────────

  const snoColumn: ColumnDef = {
    field: 'sno',
    headerName: 'S.No',
    width: 70,
    sortable: false,
    renderCell: (params: any) => (workList.page - 1) * workList.limit + (params.index || 0) + 1,
  };

  const statusRenderCell = (params: any) => {
    const s = params.row?.status || '';
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      inprogress: 'bg-blue-100 text-blue-700',
      issue: 'bg-orange-100 text-orange-700',
      open: 'bg-red-100 text-red-700',
      closed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-700',
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[s] || 'bg-gray-100 text-gray-600'}`}
      >
        {s}
      </span>
    );
  };

  const priorityRenderCell = (params: any) => {
    const p = params.row?.priority || '';
    const map: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[p] || 'bg-gray-100 text-gray-600'}`}
      >
        {p || '-'}
      </span>
    );
  };

  const columnsMap: Record<Tab, ColumnDef[]> = {
    task: [
      snoColumn,
      { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: p => p.row?.title || '-' },
      { field: 'category', headerName: 'Category', flex: 1, sortable: true, valueGetter: p => p.row?.category || '-' },
      {
        field: 'frequency',
        headerName: 'Frequency',
        flex: 1,
        sortable: true,
        valueGetter: p => p.row?.frequency || '-',
      },
      { field: 'laneNo', headerName: 'Lane', width: 80, sortable: true, valueGetter: p => p.row?.laneNo ?? '-' },
      { field: 'steps', headerName: 'Steps', width: 80, sortable: false, valueGetter: p => p.row?.steps?.length ?? 0 },
      { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
      { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
    ],
    issue: [
      snoColumn,
      { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: p => p.row?.title || '-' },
      { field: 'category', headerName: 'Category', flex: 1, sortable: true, valueGetter: p => p.row?.category || '-' },
      { field: 'laneNo', headerName: 'Lane', width: 80, sortable: true, valueGetter: p => p.row?.laneNo ?? '-' },
      { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
      { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
      { field: 'notes', headerName: 'Notes', flex: 2, sortable: false, valueGetter: p => p.row?.notes || '-' },
    ],
    log: [
      {
        field: 'title',
        headerName: 'Task',
        flex: 2,
        sortable: true,
        renderCell: (params: any) => <span className="font-semibold text-gray-900">{params.row?.title || '-'}</span>,
      },
      {
        field: 'laneNo',
        headerName: 'Lane',
        flex: 1,
        sortable: true,
        valueGetter: p => (p.row?.laneNo ? `Lane ${p.row.laneNo}` : '-'),
      },
      {
        field: 'frequency',
        headerName: 'Frequency',
        flex: 1,
        sortable: true,
        valueGetter: p => {
          const f = p.row?.frequency;
          return f ? f.charAt(0).toUpperCase() + f.slice(1) : '-';
        },
      },
      {
        field: 'status',
        headerName: 'Action',
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          const s = params.value || params.row?.status;
          if (s === 'completed' || s === 'done') {
            return (
              <span className="flex items-center gap-1 font-semibold text-green-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                </svg>
                Done
              </span>
            );
          }
          if (s === 'issue') {
            return (
              <span className="flex items-center gap-1 font-semibold text-red-500">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11.5l-1-1H5v4m0-4h14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Issue
              </span>
            );
          }
          return <span className="capitalize text-gray-500">{s || '-'}</span>;
        },
      },
      {
        field: 'createdBy',
        headerName: 'Created By',
        flex: 1,
        sortable: true,
        valueGetter: p => p.row?.createdByName || p.row?.raisedByName || p.row?.updatedByName || p.row?.updatedBy || p.row?.createdBy || '-',
      },
      {
        field: 'createdAt',
        headerName: 'Date & Time',
        flex: 1.5,
        sortable: true,
        valueGetter: p => {
          if (!p.row?.createdAt) return '-';
          return new Date(p.row.createdAt).toLocaleString('en-US', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
          });
        },
      },
    ],
    schedule: [
      snoColumn,
      { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: p => p.row?.title || '-' },
      { field: 'category', headerName: 'Category', flex: 1, sortable: true, valueGetter: p => p.row?.category || '-' },
      {
        field: 'frequency',
        headerName: 'Frequency',
        flex: 1,
        sortable: true,
        valueGetter: p => p.row?.frequency || '-',
      },
      {
        field: 'scheduledDate',
        headerName: 'Scheduled Date',
        flex: 1.2,
        sortable: true,
        valueGetter: p => p.row?.scheduledDate || '-',
      },
      { field: 'laneNo', headerName: 'Lane', width: 80, sortable: true, valueGetter: p => p.row?.laneNo ?? '-' },
      { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
    ],
  };

  const adaptColumns = (cols: ColumnDef[]) =>
    cols.map(col => ({
      id: col.field,
      label: col.headerName,
      width: col.width,
      minWidth: col.minWidth,
      sortable: col.sortable !== false,
      renderCell: col.renderCell
        ? (value: any, row: any, index: number) => col.renderCell?.({ value, row, index })
        : col.valueGetter
          ? (value: any, row: any, index: number) => col.valueGetter?.({ value, row, index }) || ''
          : undefined,
    }));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="w-full max-w-full">
        <SectionTitle
          actionButtonLabel="Add Task"
          description="Manage facility maintenance tasks and schedules."
          inputPlaceholder=""
          search={false}
          title="Maintenance"
          value=""
          onActionButtonClick={() => setShowAddTask(true)}
        />

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Tabs + Frequency toggle */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center justify-between">
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
                    {tab.key === 'issue' && issueCount !== null && issueCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {issueCount > 99 ? '99+' : issueCount}
                      </span>
                    )}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 h-[2.5px] w-full rounded-full bg-[#21295A]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                {taskFrequencies.map(f => (
                  <button
                    key={f.key}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      taskFrequency === f.key
                        ? 'bg-white text-[#21295A] shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    type="button"
                    onClick={() => {
                      setTaskFrequency(f.key);
                      setActiveTab('task');
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lane filter strip — task tab only */}
          {activeTab === 'task' && (
            <div className="flex gap-2 border-b border-gray-100 bg-gray-50/60 px-6 py-3">
              {Array.from({ length: 7 }, (_, i) => i + 1).map(lane => (
                <button
                  key={lane}
                  className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
                    selectedLane === lane
                      ? 'bg-[#21295A] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-500 hover:border-[#21295A]/40 hover:text-[#21295A]'
                  }`}
                  type="button"
                  onClick={() => setSelectedLane(lane)}
                >
                  Lane {lane}
                </button>
              ))}
            </div>
          )}

          {/* 7-day date strip — schedule tab only */}
          {activeTab === 'schedule' && (
            <div className="overflow-x-auto border-b border-gray-200 px-6">
              <div className="flex">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
                  const dateStr = toDateStr(d);
                  const isSelected = selectedScheduleDate === dateStr;
                  const dayLabel =
                    i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <button
                      key={dateStr}
                      className="relative flex shrink-0 flex-col items-center px-6 pb-3 pt-3 text-center transition-colors"
                      type="button"
                      onClick={() => setSelectedScheduleDate(dateStr)}
                    >
                      <span
                        className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {dayLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {scheduleCountByDate[dateStr] > 0 ? (
                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#21295A] text-[10px] font-bold text-white">
                          {scheduleCountByDate[dateStr] > 9 ? '9+' : scheduleCountByDate[dateStr]}
                        </span>
                      ) : (
                        <span className="mt-1 h-5" />
                      )}
                      {isSelected && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#21295A]" />}
                    </button>
                  );
                })}
                {/* Overdue */}
                {(() => {
                  const isSelected = selectedScheduleDate === 'overdue';
                  return (
                    <button
                      className="relative flex shrink-0 flex-col items-center px-6 pb-3 pt-3 text-center transition-colors"
                      type="button"
                      onClick={() => setSelectedScheduleDate('overdue')}
                    >
                      <span
                        className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Overdue
                      </span>
                      <span className="text-xs text-gray-400">Past due</span>
                      {isSelected && workList.total > 0 ? (
                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {workList.total > 9 ? '9+' : workList.total}
                        </span>
                      ) : (
                        <span className="mt-1 h-5" />
                      )}
                      {isSelected && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#21295A]" />}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {activeTab === 'task' ? (
              isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
              ) : (workList.items || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No tasks found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(workList.items || []).map(item => (
                    <TaskCard
                      key={item.itemId}
                      item={item}
                      onSchedule={setSchedulingItem}
                      onStepsView={setSelectedItem}
                    />
                  ))}
                </div>
              )
            ) : activeTab === 'schedule' ? (
              isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
              ) : scheduleDisplayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No scheduled tasks found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {scheduleDisplayItems.map(item => (
                    <ScheduleCard
                      key={item.itemId}
                      item={item}
                      onFlagIssue={setFlagIssueItem}
                      onMarkDone={setMarkDoneItem}
                      onSchedule={setSchedulingItem}
                      onStepsView={setSelectedItem}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              )
            ) : activeTab === 'issue' ? (
              isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
              ) : (workList.items || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11.5l-1-1H5v4m0-4h14"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No issues found</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(workList.items || []).map((item, index) => (
                    <IssueCard
                      key={item.itemId}
                      index={index}
                      item={item}
                      onViewIssue={(i, idx) => setViewIssue({ item: i, index: idx })}
                    />
                  ))}
                </div>
              )
            ) : (
              <DataTable
                columns={adaptColumns(columnsMap[activeTab])}
                data={workList.items || []}
                emptyState={{ subtitle: 'No records available', title: 'No records found' }}
                getRowId={(row: any) => row.itemId}
                loading={isLoading}
                page={(workList.page || 1) - 1}
                rowsPerPage={workList.limit || 20}
                serverSide={true}
                totalRows={workList.total || 0}
                onPageChange={(page: number) => fetchList(activeTab, taskFrequency, page + 1, workList.limit || 20)}
                onRowsPerPageChange={(limit: number) => fetchList(activeTab, taskFrequency, 1, limit)}
              />
            )}
          </div>
        </div>
      </div>

      {selectedItem && <StepsModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

      {flagIssueItem && (
        <FlagIssueModal
          dispatch={dispatch}
          facilityCode={FACILITY_CODE}
          item={flagIssueItem}
          updatedBy={currentUserId}
          onClose={() => setFlagIssueItem(null)}
          onSuccess={onSuccess}
        />
      )}

      {markDoneItem && (
        <MarkDoneModal
          dispatch={dispatch}
          facilityCode={FACILITY_CODE}
          item={markDoneItem}
          updatedBy={currentUserId}
          onClose={() => setMarkDoneItem(null)}
          onSuccess={onSuccess}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          dispatch={dispatch}
          onClose={() => setShowAddTask(false)}
          onSuccess={() => fetchList(activeTab, taskFrequency, 1)}
        />
      )}

      {schedulingItem && (
        <ScheduleModal
          dispatch={dispatch}
          item={schedulingItem}
          updatedBy={currentUserId}
          onClose={() => setSchedulingItem(null)}
          onSuccess={onSuccess}
        />
      )}

      {viewIssue && (
        <IssueDetailModal
          dispatch={dispatch}
          index={viewIssue.index}
          item={viewIssue.item}
          updatedBy={currentUserId}
          onClose={() => setViewIssue(null)}
          onSuccess={() => {
            fetchList('issue', taskFrequency, workList.page || 1);
            setViewIssue(null);
          }}
        />
      )}
    </>
  );
};

export default Maintenance;
