import { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { LoaderSpinner } from '../../components/Loader';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { buildRoute } from '../../constants/routes';
import { inductionList, updateInductionBookingStatus } from '../../store/induction/api';
import { AppDispatch, RootState } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

type FilterState = {
  date: string;
  email: string;
  status: string;
};

const defaultFilters: FilterState = {
  date: '',
  email: '',
  status: 'all',
};

function parseFiltersFromSearchParams(searchParams: URLSearchParams): FilterState {
  return {
    date: searchParams.get('date') ?? '',
    email: searchParams.get('email') ?? '',
    status: searchParams.get('status') ?? 'pending',
  };
}

function filtersToSearchParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.date) params.date = filters.date;
  if (filters.email.trim()) params.email = filters.email.trim();
  if (filters.status) params.status = filters.status;
  return params;
}

const statusMap: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  confirmed: { label: 'Pending Activation', className: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  noshow: { label: 'No Show', className: 'bg-orange-100 text-orange-700' },
};

const Induction = () => {
  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromSearchParams(searchParams));
  const [undoConfirm, setUndoConfirm] = useState<{ userId: string; bookingCode: string } | null>(null);

  const applyFilters = () => {
    const params = filtersToSearchParams(filters);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const applied = parseFiltersFromSearchParams(searchParams);
    dispatch(
      inductionList({
        date: applied.date,
        page: 1,
        type: 'inductionbooking',
        listLimit: inductionListData?.limit || 20,
        email: applied.email,
        status: applied.status === 'pending' ? 'confirmed' : applied.status === 'all' ? '' : applied.status,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchParams]);

  const currentPage = inductionListData?.page ? inductionListData.page - 1 : 0;
  const rowsPerPage = inductionListData?.limit || 20;

  const inductionColumns: ColumnDef[] = useMemo(
    () => [
      {
        field: 'S.No',
        headerName: 'S.No',
        width: 60,
        sortable: false,
        renderCell: (params: any) => {
          const serialNumber = currentPage * rowsPerPage + (params.index || 0) + 1;
          return <span className="text-[13px] font-medium text-gray-400">{serialNumber}</span>;
        },
      },
      {
        field: 'firstName',
        headerName: 'Name',
        flex: 1.2,
        sortable: true,
        renderCell: (params: any) => {
          const firstName = params.row?.firstName || '';
          const lastName = params.row?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return (
            <div>
              <p className="text-[13px] font-semibold text-[#21295A]">{fullName}</p>
              <p className="text-[11px] text-gray-400">{params.row?.email || ''}</p>
            </div>
          );
        },
        valueGetter: params => {
          return `${params.row?.firstName || ''} ${params.row?.lastName || ''}`.trim();
        },
      },
      {
        field: 'bookingCode',
        headerName: 'Booking Date',
        flex: 1,
        sortable: false,
        renderCell: (params: any) => (
          <span className="text-[13px] text-gray-700">{formatDateChicago(params.row?.timeSlot?.startTime)}</span>
        ),
        valueGetter: params => formatDateChicago(params.row?.timeSlot?.startTime),
      },
      {
        field: 'Slot Time',
        headerName: 'Slot Time',
        flex: 1,
        sortable: true,
        renderCell: (params: any) => {
          const startTime = params.row?.timeSlot?.startTime;
          const endTime = params.row?.timeSlot?.endTime;
          if (!startTime || !endTime) return <span className="text-gray-400">—</span>;
          return <span className="text-[13px] text-gray-700">{formatTimeRangeChicago(startTime, endTime)}</span>;
        },
        valueGetter: params => {
          const startTime = params.row?.timeSlot?.startTime;
          const endTime = params.row?.timeSlot?.endTime;
          if (!startTime || !endTime) return '';
          return formatTimeRangeChicago(startTime, endTime);
        },
      },
      {
        field: 'onboardingType',
        headerName: 'Plan',
        flex: 0.9,
        sortable: true,
        renderCell: (params: any) => {
          const type = params.row?.subscriptionCode || '';
          const label =
            type === 'standard' ? 'Standard' : type === 'premium' ? 'Premium' : type === 'family' ? 'Family' : type;
          return (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-600">{label}</span>
          );
        },
        valueGetter: params => {
          const type = params.row?.subscriptionCode || '';
          if (type === 'standard') return 'Standard';
          if (type === 'premium') return 'Premium';
          if (type === 'family') return 'Family';
          return type;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 1,
        sortable: true,
        renderCell: (params: any) => {
          const status = params.row?.status || '';
          const { label, className } = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
          return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{label}</span>;
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 200,
        sortable: false,
        renderCell: (params: any) => {
          const handleStatusUpdate = (status: string) => {
            dispatch(
              updateInductionBookingStatus({
                userId: params.row.userId,
                bookingCode: params.row.bookingCode,
                status,
              })
            )
              .unwrap()
              .then(res => {
                if (res?.status === 'success') {
                  const applied = parseFiltersFromSearchParams(searchParams);
                  dispatch(
                    inductionList({
                      date: applied.date,
                      page: inductionListData?.page || 1,
                      type: 'inductionbooking',
                      listLimit: inductionListData?.limit || 20,
                      email: applied.email,
                      status:
                        applied.status === 'pending' ? 'confirmed' : applied.status === 'all' ? '' : applied.status,
                    })
                  );
                  toast.success('Induction status updated successfully!');
                } else {
                  toast.error('Failed to update induction status!');
                }
              })
              .catch(err => {
                console.error('Failed to update induction status:', err);
                toast.error(err || 'Failed to update induction status!');
              });
          };

          const isNoShow = params.row?.status === 'noshow';
          return (
            <div className="flex items-center gap-2">
              {!isNoShow && (
                <button
                  className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
                  title="View induction details"
                  onClick={e => {
                    e.stopPropagation();
                    navigate(buildRoute.viewInduction(params.row.userId), { state: { listSearch: location.search } });
                  }}
                >
                  View
                </button>
              )}
              {params.row?.status === 'confirmed' && (
                <button
                  className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[12px] font-semibold text-orange-700 transition-all hover:bg-orange-600 hover:text-white"
                  title="Mark as no show"
                  onClick={e => {
                    e.stopPropagation();
                    handleStatusUpdate('noshow');
                  }}
                >
                  {isLoading ? <LoaderSpinner className="text-current" size="xs" /> : 'No Show'}
                </button>
              )}
              {isNoShow && (
                <button
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-600 hover:text-white"
                  title="Undo no show"
                  onClick={e => {
                    e.stopPropagation();
                    setUndoConfirm({ userId: params.row.userId, bookingCode: params.row.bookingCode });
                  }}
                >
                  Undo
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [
      currentPage,
      rowsPerPage,
      dispatch,
      navigate,
      location.search,
      searchParams,
      inductionListData?.page,
      inductionListData?.limit,
      isLoading,
    ]
  );

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Induction</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">Manage induction bookings and attendance</p>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Email */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="induction-email-filter"
              >
                Email
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="induction-email-filter"
                  placeholder="Search by email…"
                  type="text"
                  value={filters.email}
                  onChange={e => setFilters(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="induction-date-filter"
              >
                Date
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="induction-date-filter"
                type="date"
                value={filters.date}
                onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="induction-status-filter"
              >
                Status
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="induction-status-filter"
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Activation</option>
                <option value="completed">Completed</option>
                <option value="noshow">No Show</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
              type="button"
              onClick={() => {
                setFilters(defaultFilters);
                setSearchParams({ status: 'all' }, { replace: true });
              }}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
              disabled={isLoading}
              type="button"
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Induction Table ─────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <DataTable
          columns={inductionColumns.map(col => ({
            id: col.field,
            label: col.headerName,
            minWidth: col.minWidth,
            width: col.width,
            sortable: col.sortable !== false,
            renderCell: col.renderCell
              ? (value: any, row: any, index: number) => col.renderCell?.({ value, row, index })
              : col.valueGetter
                ? (value: any, row: any) => col.valueGetter?.({ value, row, index: 0 }) || ''
                : undefined,
            sortValue: (row: any) => {
              if (col.field === 'firstName')
                return `${row?.firstName || ''} ${row?.lastName || ''}`.trim().toLowerCase();
              if (col.field === 'email') return (row?.email || '').toLowerCase();
              if (col.field === 'Slot Time') return row?.timeSlot?.startTime || '';
              if (col.field === 'onboardingType') return row?.subscriptionCode || '';
              if (col.field === 'status') return row?.status || '';
              if (col.field === 'bookingCode') return row?.timeSlot?.startTime || '';
              if (col.field === 'S.No' || col.field === 'actions') return '';
              return row?.[col.field] || '';
            },
          }))}
          data={inductionListData?.bookings || []}
          emptyState={{
            icon: (
              <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
            ),
            subtitle: 'Try adjusting your search criteria',
            title: 'No induction bookings found',
          }}
          getRowId={(row: any) => row.userId || row.bookingCode}
          loading={isLoading}
          page={inductionListData?.page ? inductionListData.page - 1 : 0}
          rowsPerPage={inductionListData?.limit || 20}
          serverSide={true}
          totalRows={inductionListData?.total || 0}
          onPageChange={(page: number) => {
            const pageNumber = page + 1;
            dispatch(
              inductionList({
                page: pageNumber,
                date: filters.date,
                type: 'inductionbooking',
                listLimit: inductionListData?.limit || 20,
                email: filters.email,
                status: filters.status === 'pending' ? 'confirmed' : filters.status === 'all' ? '' : filters.status,
              })
            );
          }}
          onRowClick={(row: any) => {
            navigate(buildRoute.viewInduction(row.userId), { state: { listSearch: location.search } });
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            dispatch(
              inductionList({
                page: 1,
                date: filters.date,
                type: 'inductionbooking',
                listLimit: rowsPerPage,
                email: filters.email,
                status: filters.status === 'pending' ? 'confirmed' : filters.status === 'all' ? '' : filters.status,
              })
            );
          }}
          onSortChange={_sort => {
            /* client-side sort handled by DataTable */
          }}
        />
      </div>

      {/* ── Undo No Show Modal ──────────────────────────────── */}
      {undoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-[15px] font-bold text-[#21295A]">Undo No Show</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-gray-500">
                Change status from <span className="font-semibold text-orange-600">No Show</span> back to{' '}
                <span className="font-semibold text-yellow-600">Pending Activation</span>?
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
                type="button"
                onClick={() => setUndoConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={() => {
                  dispatch(
                    updateInductionBookingStatus({
                      userId: undoConfirm.userId,
                      bookingCode: undoConfirm.bookingCode,
                      status: 'confirmed',
                    })
                  )
                    .unwrap()
                    .then(res => {
                      if (res?.status === 'success') {
                        const applied = parseFiltersFromSearchParams(searchParams);
                        dispatch(
                          inductionList({
                            date: applied.date,
                            page: inductionListData?.page || 1,
                            type: 'inductionbooking',
                            listLimit: inductionListData?.limit || 20,
                            email: applied.email,
                            status:
                              applied.status === 'pending'
                                ? 'confirmed'
                                : applied.status === 'all'
                                  ? ''
                                  : applied.status,
                          })
                        );
                        toast.success('Status changed back to Pending!');
                      } else {
                        toast.error('Failed to update status!');
                      }
                    })
                    .catch(err => toast.error(err || 'Failed to update status!'))
                    .finally(() => setUndoConfirm(null));
                }}
              >
                {isLoading ? 'Updating…' : 'Yes, Undo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Induction;
