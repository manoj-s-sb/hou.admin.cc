import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import UserTable, { ColumnDef } from '../../components/UserTable';
import { inductionList } from '../../store/induction/api';
import { setSelectedInduction } from '../../store/induction/reducers';
import { AppDispatch, RootState } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

const Induction = () => {
  const { inductionList: inductionListData, isLoading } = useSelector((state: RootState) => state.induction);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    dispatch(
      inductionList({
        date: selectedDate,
        page: 1,
        type: 'inductionbooking',
        listLimit: 20,
      })
    );
  }, [dispatch, selectedDate]);

  // Define custom columns for the induction table
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
      field: 'onboardingType',
      headerName: 'Subscription Type',
      flex: 1.3,
      sortable: true,
      valueGetter: params => {
        const type = params.row?.onboardingType || '';
        if (type === 'someoneelse') return 'Someone else';
        if (type === 'individual') return 'Individual';
        if (type === 'family') return 'Family';
        return type;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: any) => (
        <button
          className="rounded-full p-2 transition-colors hover:bg-gray-100"
          title="View Details"
          onClick={() => {
            navigate('/view-induction');
            dispatch(setSelectedInduction(params.row));
          }}
        >
          <svg
            className="h-5 w-5 text-gray-600 hover:text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <path
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      ),
    },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        description="Manage your induction process."
        inputPlaceholder="Search induction..."
        search={false}
        title="Induction"
        value={searchTerm}
        onSearch={setSearchTerm}
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

      {/* Table Wrapper for Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto">
        <UserTable
          columns={inductionColumns}
          data={inductionListData?.bookings}
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
            title: 'No induction found',
            subtitle: 'Try adjusting your search criteria',
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

export default Induction;
