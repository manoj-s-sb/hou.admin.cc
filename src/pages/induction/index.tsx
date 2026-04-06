import { useEffect, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { LoaderSpinner } from '../../components/Loader';
import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { inductionList, updateInductionBookingStatus } from '../../store/induction/api';
// import { setSelectedInduction } from '../../store/induction/reducers';
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
  status: 'pending',
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
  if (filters.status && filters.status !== 'pending') params.status = filters.status;
  return params;
}

const Induction = () => {
  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromSearchParams(searchParams));

  const applyFilters = () => {
    const params = filtersToSearchParams(filters);
    setSearchParams(params, { replace: true });
  };

  // Sync filter state from URL when search params change (e.g. back from view-induction)
  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  // Fetch list when URL/search params change (restores filtered list on return from view-induction)
  useEffect(() => {
    const applied = parseFiltersFromSearchParams(searchParams);
    dispatch(
      inductionList({
        date: applied.date,
        page: 1,
        type: 'inductionbooking',
        listLimit: inductionListData?.limit || 20,
        email: applied.email,
        status: applied.status === 'pending' ? 'confirmed' : applied.status,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchParams]);

  // Define custom columns for the induction table
  const currentPage = inductionListData?.page ? inductionListData.page - 1 : 0;
  const rowsPerPage = inductionListData?.limit || 20;

  const inductionColumns: ColumnDef[] = [
    {
      field: 'S.No',
      headerName: 'S.No',
      width: 80,
      sortable: false,
      renderCell: (params: any) => {
        const serialNumber = currentPage * rowsPerPage + (params.index || 0) + 1;
        return serialNumber;
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
      field: 'onboardingType',
      headerName: 'Subscription Type',
      flex: 1.3,
      sortable: true,
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
      flex: 1.3,
      sortable: true,
      renderCell: (params: any) => {
        const status = params.row?.status || '';
        const statusColors: Record<string, string> = {
          completed: 'bg-green-100 text-green-800',
          confirmed: 'bg-yellow-100 text-yellow-800',
          cancelled: 'bg-red-100 text-red-800',
          noshow: 'bg-orange-100 text-orange-800',
        };
        const label =
          status === 'confirmed' ? 'Pending' :
          status === 'noshow' ? 'No Show' :
          status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
        const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${colorClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 220,
      sortable: false,
      renderCell: (params: any) => {
        const isSettled = params.row?.status === 'noshow';
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
                    status: applied.status === 'pending' ? 'confirmed' : applied.status,
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
        return (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 shadow-sm transition-all duration-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white"
              title="View induction details"
              onClick={e => {
                e.stopPropagation();
                navigate(`/view-induction/${params.row.userId}`, { state: { listSearch: location.search } });
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              View
            </button>
            <button
              className={`flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 shadow-sm transition-all duration-200 hover:border-orange-600 hover:bg-orange-600 hover:text-white ${isSettled ? 'cursor-not-allowed opacity-40' : ''}`}
              disabled={isSettled}
              title="Mark induction as no show"
              onClick={e => {
                e.stopPropagation();
                handleStatusUpdate('noshow');
              }}
            >
              {isLoading ? (
                <LoaderSpinner className="text-current" size="xs" />
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
                  </svg>
                  Mark No Show
                </>
              )}
            </button>
          </div>
        );
      },
    },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="w-full max-w-full max-[560px]:overflow-x-hidden">
      <SectionTitle
        description="Manage induction Bookings."
        inputPlaceholder="Search induction..."
        search={false}
        title="Induction"
        value={searchTerm}
        onSearch={setSearchTerm}
      />

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="induction-email-filter">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="induction-email-filter"
              placeholder="Search by email"
              type="text"
              value={filters.email}
              onChange={e => setFilters(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="induction-date">
              Select Date
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="induction-date"
              type="date"
              value={filters.date}
              onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="induction-status-filter">
              Status
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="induction-status-filter"
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
            className="rounded-xl border border-gray-200 px-5 py-2 text-[13px] font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            type="button"
            onClick={() => {
              setFilters(defaultFilters);
              setSearchParams({}, { replace: true });
              dispatch(
                inductionList({
                  date: '',
                  page: 1,
                  type: 'inductionbooking',
                  listLimit: inductionListData?.limit || 20,
                  email: '',
                })
              );
            }}
          >
            Reset
          </button>
          <button
            className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            type="button"
            onClick={applyFilters}
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
                ? (value: any, row: any) => col.valueGetter?.({ value, row, index: 0 }) || ''
                : undefined,
            // Add sortValue function to extract sortable value from raw data properties
            sortValue: (row: any) => {
              // Map column field names to actual data property names for sorting
              if (col.field === 'firstName') {
                return `${row?.firstName || ''} ${row?.lastName || ''}`.trim().toLowerCase();
              }
              if (col.field === 'email') {
                return (row?.email || '').toLowerCase();
              }
              if (col.field === 'Slot Time') {
                // Sort by start time
                return row?.timeSlot?.startTime || '';
              }
              if (col.field === 'onboardingType') {
                return row?.subscriptionCode || '';
              }
              if (col.field === 'status') {
                return row?.status || '';
              }
              if (col.field === 'bookingCode') {
                return row?.timeSlot?.startTime || '';
              }
              // For S.No and actions, return empty string (not sortable)
              if (col.field === 'S.No' || col.field === 'actions') {
                return '';
              }
              // Fallback to direct property access
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
            title: 'No induction found',
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
                status: filters.status === 'pending' ? 'confirmed' : filters.status,
              })
            );
          }}
          onRowClick={(row: any) => {
            navigate(`/view-induction/${row.userId}`, { state: { listSearch: location.search } });
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            dispatch(
              inductionList({
                page: 1,
                date: filters.date,
                type: 'inductionbooking',
                listLimit: rowsPerPage,
                email: filters.email,
                status: filters.status === 'pending' ? 'confirmed' : filters.status,
              })
            );
          }}
          onSortChange={() => {
            // Handle server-side sorting if API supports it
            // For now, this will allow client-side sorting on current page
            // TODO: Add sort parameters to API call when backend supports it
          }}
        />
      </div>
    </div>
  );
};

export default Induction;
