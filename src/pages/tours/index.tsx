import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { LoaderSpinner } from '../../components/Loader';
import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { inductionList, updateTourStatus } from '../../store/induction/api';
import { AppDispatch, RootState } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

const Tours = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);

  const [selectedDate, setSelectedDate] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

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

  const inductionColumns: ColumnDef[] = [
    {
      field: 'S.No',
      headerName: 'S.No',
      width: 80,
      sortable: false,
      valueGetter: (params: any) => {
        const currentPage = inductionListData.page || 1;
        const limit = inductionListData.limit || 20;
        const index = (currentPage - 1) * limit + params.index + 1;
        return index;
      },
    },
    {
      field: 'firstName',
      headerName: 'Name',
      flex: 1.2,
      sortable: true,
      valueGetter: params => {
        const firstName = params.row?.firstName || '';
        const lastName = params.row?.lastName || '';
        return `${firstName} ${lastName}`.trim();
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      sortable: true,
      valueGetter: params => {
        return params.row?.email || '';
      },
    },
    {
      field: 'bookingCode',
      headerName: 'Booking Date',
      flex: 1.2,
      sortable: false,
      valueGetter: params => {
        return formatDateChicago(params.row?.timeSlot?.startTime);
      },
    },
    {
      field: 'Slot Time',
      headerName: 'Slot Time',
      flex: 1.2,
      sortable: true,
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
        const statusColors = {
          completed: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          cancelled: 'bg-red-100 text-red-800',
          noshow: 'bg-orange-100 text-orange-800',
        };
        const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

        return (
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${colorClass}`}>
            {status === 'confirmed' ? 'Pending' : status === 'noshow' ? 'No Show' : status}
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 240,
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
        if (params.row?.status !== 'confirmed') {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 shadow-sm transition-all duration-200 hover:border-green-600 hover:bg-green-600 hover:text-white"
              title="Mark tour as completed"
              onClick={() => handleStatusUpdate('completed')}
            >
              {isLoading ? <LoaderSpinner className="text-current" size="xs" /> : <>Mark Complete</>}
            </button>
            <button
              className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 shadow-sm transition-all duration-200 hover:border-orange-600 hover:bg-orange-600 hover:text-white"
              title="Mark tour as no show"
              onClick={() => handleStatusUpdate('noshow')}
            >
              {isLoading ? <LoaderSpinner className="text-current" size="xs" /> : <>Mark No Show</>}
            </button>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return (
    <div className="w-full max-w-full max-[560px]:overflow-x-hidden">
      <SectionTitle
        description="Manage tour Bookings."
        inputPlaceholder=""
        search={false}
        title="Tour Details"
        value=""
      />

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="tour-email-filter">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="tour-email-filter"
              placeholder="Search by email"
              type="text"
              value={emailFilter}
              onChange={e => setEmailFilter(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="tour-date">
              Select Date
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="tour-date"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="tour-status-filter">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="tour-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="noshow">No Show</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
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
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            type="button"
            onClick={() => applyFilters(1, currentLimit)}
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div>
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
            title: 'No tour found',
          }}
          getRowId={(row: any) => row.bookingCode || row.userId}
          loading={isLoading}
          page={(inductionListData.page || 1) - 1}
          rowsPerPage={inductionListData.limit || 20}
          serverSide={true}
          totalRows={inductionListData.total}
          onPageChange={(page: number) => {
            const limit = inductionListData.limit || 20;
            const newPage = page + 1; // DataTable uses 0-based page, API uses 1-based
            if (newPage !== (inductionListData.page || 1)) {
              applyFilters(newPage, limit);
            }
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            // When changing rows per page, reset to first page
            applyFilters(1, rowsPerPage);
          }}
        />
      </div>
    </div>
  );
};

export default Tours;
