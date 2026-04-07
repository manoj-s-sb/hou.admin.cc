import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { getWorkList } from '../../store/maintenance/api';
import { Work, WorkStep } from '../../store/maintenance/types';
import { AppDispatch, RootState } from '../../store/store';

interface StepsModalProps {
  item: Work;
  onClose: () => void;
}

const StepsModal = ({ item, onClose }: StepsModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <p className="text-base font-bold text-gray-900">{item.title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{item.steps?.length || 0} steps</p>
        </div>
        <button
          className="ml-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          type="button"
          onClick={onClose}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="overflow-y-auto px-6 py-6">
        {item.steps && item.steps.length > 0 ? (
          <div className="flex flex-col">
            {item.steps.map((step: WorkStep, index: number) => (
              <div key={step.stepId} className="relative flex gap-4">
                {/* Number + line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#21295A] text-xs font-bold text-white">
                    {step.order}
                  </div>
                  {index < item.steps.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200" style={{ minHeight: '28px' }} />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-6">
                  <p className="text-sm font-medium text-gray-800">{step.title}</p>
                  {step.imageUrl && (
                    <img
                      alt={`Step ${step.order}`}
                      className="mt-2 rounded-lg object-cover"
                      src={step.imageUrl}
                      style={{ maxHeight: 140 }}
                    />
                  )}
                  {step.videoUrl && (
                    <a
                      className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      href={step.videoUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch video
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">No steps available.</p>
        )}
      </div>
    </div>
  </div>
);

type Tab = 'task' | 'issue' | 'log' | 'schedule';
type TaskFrequency = 'weekly' | 'bi-weekly' | 'monthly';

const tabs: { key: Tab; label: string }[] = [
  { key: 'issue', label: 'Issue' },
  { key: 'log', label: 'Log' },
  { key: 'schedule', label: 'Schedule' },
];

const taskFrequencies: { key: TaskFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'bi-weekly', label: 'Bi-Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const FACILITY_CODE = 'HOU01';

const Maintenance = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workList, isLoading } = useSelector((state: RootState) => state.maintenance);

  const [activeTab, setActiveTab] = useState<Tab>('task');
  const [taskFrequency, setTaskFrequency] = useState<TaskFrequency>('weekly');
  const [selectedItem, setSelectedItem] = useState<Work | null>(null);

  const fetchList = (type: Tab, frequency: TaskFrequency, page = 1, limit = workList.limit || 20) => {
    dispatch(
      getWorkList({
        facilityCode: FACILITY_CODE,
        page,
        limit,
        type,
        ...(type === 'task' && { frequency }),
      })
    );
  };

  useEffect(() => {
    fetchList(activeTab, taskFrequency, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, taskFrequency]);

  const snoColumn: ColumnDef = {
    field: 'sno',
    headerName: 'S.No',
    width: 70,
    sortable: false,
    renderCell: (params: any) => {
      const currentPage = workList.page || 1;
      const limit = workList.limit || 20;
      return (currentPage - 1) * limit + (params.index || 0) + 1;
    },
  };

  const statusRenderCell = (params: any) => {
    const s = params.row?.status || '';
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      inprogress: 'bg-blue-100 text-blue-700',
      open: 'bg-red-100 text-red-700',
      closed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-700',
    };
    const cls = map[s] || 'bg-gray-100 text-gray-600';
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}>{s}</span>;
  };

  const priorityRenderCell = (params: any) => {
    const p = params.row?.priority || '';
    const map: Record<string, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    const cls = map[p] || 'bg-gray-100 text-gray-600';
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}>{p || '-'}</span>;
  };

  const taskColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.frequency || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    {
      field: 'steps',
      headerName: 'Steps',
      width: 80,
      sortable: false,
      valueGetter: params => params.row?.steps?.length ?? 0,
    },
    { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
  ];

  const issueColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    { field: 'priority', headerName: 'Priority', flex: 1, sortable: true, renderCell: priorityRenderCell },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
    { field: 'notes', headerName: 'Notes', flex: 2, sortable: false, valueGetter: params => params.row?.notes || '-' },
  ];

  const logColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    { field: 'notes', headerName: 'Notes', flex: 2, sortable: false, valueGetter: params => params.row?.notes || '-' },
    {
      field: 'createdAt',
      headerName: 'Created At',
      flex: 1.2,
      sortable: true,
      valueGetter: params => (params.row?.createdAt ? new Date(params.row.createdAt).toLocaleDateString() : '-'),
    },
  ];

  const scheduleColumns: ColumnDef[] = [
    snoColumn,
    { field: 'title', headerName: 'Title', flex: 2, sortable: true, valueGetter: params => params.row?.title || '-' },
    {
      field: 'category',
      headerName: 'Category',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.category || '-',
    },
    {
      field: 'frequency',
      headerName: 'Frequency',
      flex: 1,
      sortable: true,
      valueGetter: params => params.row?.frequency || '-',
    },
    {
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      flex: 1.2,
      sortable: true,
      valueGetter: params => params.row?.scheduledDate || '-',
    },
    {
      field: 'laneId',
      headerName: 'Lane',
      width: 80,
      sortable: true,
      valueGetter: params => params.row?.laneId ?? '-',
    },
    { field: 'status', headerName: 'Status', flex: 1, sortable: true, renderCell: statusRenderCell },
  ];

  const columnsMap: Record<Tab, ColumnDef[]> = {
    task: taskColumns,
    issue: issueColumns,
    log: logColumns,
    schedule: scheduleColumns,
  };

  const columns = columnsMap[activeTab];

  return (
    <>
      <div className="w-full max-w-full">
        <SectionTitle
          description="Manage facility maintenance tasks and schedules."
          inputPlaceholder=""
          search={false}
          title="Maintenance"
          value=""
        />

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Tabs + Frequency toggle */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`relative pb-3 pt-4 text-sm transition-colors ${
                      activeTab === tab.key
                        ? 'font-bold text-[#21295A]'
                        : 'font-medium text-gray-400 hover:text-gray-600'
                    }`}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#21295A]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                {taskFrequencies.map(f => (
                  <button
                    key={f.key}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      taskFrequency === f.key
                        ? 'bg-white text-[#21295A] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
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
                    <div
                      key={item.itemId}
                      className="flex items-start justify-between rounded-xl border border-blue-100 bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-bold text-gray-900">{item.title}</p>
                        <div className="flex items-center gap-2">
                          {item.category && (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                                <path
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </span>
                          )}
                          {item.frequency && (
                            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
                            </span>
                          )}
                          {item.laneId && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                              Lane {item.laneId}
                            </span>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                        {item.steps && item.steps.length > 0 && (
                          <button
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                            type="button"
                            onClick={() => setSelectedItem(item)}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
                            </svg>
                            View steps &amp; video
                          </button>
                        )}
                      </div>
                      <button
                        className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1a2149]"
                        type="button"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                          />
                        </svg>
                        Schedule
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <DataTable
                columns={columns.map(col => ({
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
                }))}
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

      {selectedItem !== null && selectedItem !== undefined && (
        <StepsModal item={selectedItem as Work} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
};

export default Maintenance;
