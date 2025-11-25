import { useEffect, useState } from 'react';

import { Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import UserTable, { ColumnDef } from '../../components/UserTable';
import { inductionList, updateTourStatus } from '../../store/induction/api';
import { AppDispatch, RootState } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

const Tours = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);

  const [selectedDate, setSelectedDate] = useState('');

  const inductionColumns: ColumnDef[] = [
    {
      field: 'S.No',
      headerName: 'S.No',
      width: 80,
      sortable: false,
      valueGetter: (params: any) => {
        const index = params.index + 1;
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
        };
        const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

        return <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${colorClass}`}>{status}</span>;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <button
          className={`rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 ${params.row?.status === 'completed' ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={params.row?.status === 'completed'}
          title="Mark tour as completed"
          onClick={() => {
            dispatch(
              updateTourStatus({
                userId: params.row.userId,
                bookingCode: params.row.bookingCode,
                status: 'completed',
              })
            )
              .unwrap()
              .then(res => {
                if (res?.status === 'success') {
                  dispatch(
                    inductionList({
                      date: selectedDate,
                      page: 1,
                      type: 'tourbooking',
                      listLimit: 20,
                    })
                  );
                  toast.success('Tour status updated successfully!');
                } else {
                  toast.error('Failed to update tour status!');
                }
              });
          }}
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : 'Mark Complete'}
        </button>
      ),
    },
  ];

  useEffect(() => {
    dispatch(
      inductionList({
        date: selectedDate,
        page: 1,
        type: 'tourbooking',
        listLimit: 20,
      })
    );
  }, [dispatch, selectedDate]);

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        description="Manage your tour details."
        inputPlaceholder="Search tour..."
        title="Tour Details"
        value=""
        onSearch={() => {
          console.log('search clicked');
        }}
      />

      {/* Date Filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="whitespace-nowrap text-sm font-medium text-gray-700" htmlFor="induction-date">
          Select Date:
        </label>
        <input
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          id="induction-date"
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <UserTable
          columns={inductionColumns}
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
            title: 'No tour found',
            subtitle: '.',
          }}
          loading={isLoading}
          selectedItem={null}
          onSelectItem={() => {
            console.log('select item clicked');
          }}
        />
      </div>
    </div>
  );
};

export default Tours;
