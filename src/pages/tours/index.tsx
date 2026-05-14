import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import Button from '../../components/Button';
import { LoaderSpinner } from '../../components/Loader';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { ACCESS_SCOPES } from '../../rbac';
import { inductionList, updateTourStatus } from '../../store/induction/api';
import { AppDispatch, RootState } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

const statusMap: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  confirmed: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  noshow: { label: 'No Show', className: 'bg-orange-100 text-orange-700' },
};

const Tours = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);

  const [selectedDate, setSelectedDate] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [undoConfirm, setUndoConfirm] = useState<{ userId: string; bookingCode: string } | null>(null);

  const currentLimit = inductionListData.limit || 20;

  const applyFilters = (page = 1, limit = currentLimit) => {
    dispatch(
      inductionList({
        date: selectedDate,
        page,
        type: 'tourbooking',
        listLimit: limit,
        email: emailFilter,
        status: statusFilter === 'pending' ? 'confirmed' : statusFilter,
      })
    );
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const tourColumns: ColumnDef[] = [
    {
      field: 'S.No',
      headerName: 'S.No',
      width: 60,
      sortable: false,
      renderCell: (params: any) => {
        const currentPage = inductionListData.page || 1;
        const limit = inductionListData.limit || 20;
        const index = (currentPage - 1) * limit + params.index + 1;
        return <span className="text-[13px] font-medium text-gray-400">{index}</span>;
      },
      valueGetter: (params: any) => {
        const currentPage = inductionListData.page || 1;
        const limit = inductionListData.limit || 20;
        return (currentPage - 1) * limit + params.index + 1;
      },
    },
    {
      field: 'firstName',
      headerName: 'Name',
      flex: 1.2,
      sortable: true,
      renderCell: (params: any) => {
        const fullName = `${params.row?.firstName || ''} ${params.row?.lastName || ''}`.trim();
        return (
          <div>
            <p className="text-[13px] font-semibold text-[#21295A]">{fullName}</p>
            <p className="text-[11px] text-gray-400">{params.row?.email || ''}</p>
          </div>
        );
      },
      valueGetter: params => `${params.row?.firstName || ''} ${params.row?.lastName || ''}`.trim(),
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
      field: 'status',
      headerName: 'Status',
      flex: 1,
      sortable: true,
      renderCell: (params: any) => {
        const status = params.row?.status || 'pending';
        const { label, className } = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
        return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{label}</span>;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      renderCell: (params: any) => {
        const handleStatusUpdate = (status: string) => {
          dispatch(
            updateTourStatus({
              userId: params.row.userId,
              bookingCode: params.row.bookingCode,
              status,
            })
          )
            .unwrap()
            .then(res => {
              if (res?.status === 'success') {
                applyFilters();
                toast.success('Tour status updated successfully!');
              } else {
                toast.error('Failed to update tour status!');
              }
            })
            .catch(err => {
              console.error('Failed to update tour status:', err);
              toast.error(err || 'Failed to update tour status!');
            });
        };

        if (params.row?.status === 'noshow') {
          return (
            <Button
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-600 hover:text-white"
              module={ACCESS_SCOPES.tour}
              onClick={() => setUndoConfirm({ userId: params.row.userId, bookingCode: params.row.bookingCode })}
            >
              Undo
            </Button>
          );
        }

        if (params.row?.status !== 'confirmed') {
          return <span className="text-gray-400">—</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-700 transition-all hover:bg-green-600 hover:text-white"
              module={ACCESS_SCOPES.tour}
              onClick={() => handleStatusUpdate('completed')}
            >
              {isLoading ? <LoaderSpinner className="text-current" size="xs" /> : 'Complete'}
            </Button>
            <Button
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[12px] font-semibold text-orange-700 transition-all hover:bg-orange-600 hover:text-white"
              module={ACCESS_SCOPES.tour}
              onClick={() => handleStatusUpdate('noshow')}
            >
              {isLoading ? <LoaderSpinner className="text-current" size="xs" /> : 'No Show'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Tours</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">Manage tour bookings and attendance</p>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Email */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="tour-email-filter"
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
                  id="tour-email-filter"
                  placeholder="Search by email…"
                  type="text"
                  value={emailFilter}
                  onChange={e => setEmailFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="tour-date-filter"
              >
                Date
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="tour-date-filter"
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="tour-status-filter"
              >
                Status
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="tour-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="noshow">No Show</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={() => {
                setEmailFilter('');
                setSelectedDate('');
                setStatusFilter('all');
                dispatch(
                  inductionList({
                    date: '',
                    page: 1,
                    type: 'tourbooking',
                    listLimit: currentLimit,
                    email: '',
                    status: 'all',
                  })
                );
              }}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => applyFilters(1, currentLimit)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Tours Table ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <DataTable
          columns={tourColumns.map(col => ({
            id: col.field,
            label: col.headerName,
            minWidth: col.minWidth,
            width: col.width,
            sortable: col.sortable !== false,
            renderCell: col.renderCell
              ? (value: any, row: any, index: number) => col.renderCell?.({ value, row, index })
              : col.valueGetter
                ? (value: any, row: any, index: number) => col.valueGetter?.({ value, row, index }) || ''
                : undefined,
          }))}
          data={inductionListData.bookings}
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
            title: 'No tours found',
          }}
          getRowId={(row: any) => row.bookingCode || row.userId}
          loading={isLoading}
          page={(inductionListData.page || 1) - 1}
          rowsPerPage={inductionListData.limit || 20}
          serverSide={true}
          totalRows={inductionListData.total}
          onPageChange={(page: number) => {
            const limit = inductionListData.limit || 20;
            const newPage = page + 1;
            if (newPage !== (inductionListData.page || 1)) {
              applyFilters(newPage, limit);
            }
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            applyFilters(1, rowsPerPage);
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
                <span className="font-semibold text-yellow-600">Pending</span>?
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
              <Button
                className="rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
                loading={isLoading}
                loadingText="Updating…"
                module={ACCESS_SCOPES.tour}
                onClick={() => {
                  dispatch(
                    updateTourStatus({
                      userId: undoConfirm.userId,
                      bookingCode: undoConfirm.bookingCode,
                      status: 'confirmed',
                    })
                  )
                    .unwrap()
                    .then(res => {
                      if (res?.status === 'success') {
                        applyFilters();
                        toast.success('Status changed back to Pending!');
                      } else {
                        toast.error('Failed to update status!');
                      }
                    })
                    .catch(err => toast.error(err || 'Failed to update status!'))
                    .finally(() => setUndoConfirm(null));
                }}
              >
                Yes, Undo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tours;
