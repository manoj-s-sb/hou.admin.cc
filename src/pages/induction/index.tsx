import { useEffect, useState } from "react";
import SectionTitle from "../../components/SectionTitle";
import UserTable, { ColumnDef } from "../../components/UserTable";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { inductionList } from "../../store/induction/api";
import { useNavigate } from "react-router-dom";
import { setSelectedInduction } from "../../store/induction/reducers";

const Induction = () => {
  const { inductionList: inductionListData, isLoading } = useSelector(
    (state: RootState) => state.induction,
  );
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  console.log(inductionListData);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  useEffect(() => {
    dispatch(
      inductionList({
        date: selectedDate,
        page: 1,
        type: "inductionbooking",
        listLimit: 20,
      }),
    );
  }, [dispatch, selectedDate]);

  // Define custom columns for the induction table
  const inductionColumns: ColumnDef[] = [
    {
      field: "S.No",
      headerName: "S.No",
      width: 80,
      sortable: false,
      valueGetter: (params: any) => {
        const index = params.index + 1;
        return index;
      },
    },
    {
      field: "firstName",
      headerName: "Name",
      flex: 1.2,
      sortable: true,
      valueGetter: (params) => {
        const firstName = params.row?.firstName || "";
        const lastName = params.row?.lastName || "";
        return `${firstName} ${lastName}`.trim();
      },
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.5,
      sortable: true,
      valueGetter: (params) => {
        return params.row?.email || "";
      },
    },
    {
      field: "bookingCode",
      headerName: "Booking Date",
      flex: 1.2,
      sortable: false,
      valueGetter: (params) => {
        const date = new Date(params.row?.timeSlot?.startTime);
        return date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      },
    },
    {
      field: "Slot Time",
      headerName: "Slot Time",
      flex: 1.2,
      sortable: true,
      valueGetter: (params) => {
        console.log(params.row);
        const startTime = params.row?.timeSlot?.startTime;
        const endTime = params.row?.timeSlot?.endTime;

        if (!startTime || !endTime) return "";

        // Format time from ISO string to HH:MM AM/PM
        const formatTime = (isoString: string) => {
          const date = new Date(isoString);
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        };

        return `${formatTime(startTime)} - ${formatTime(endTime)}`;
      },
    },
    {
      field: "onboardingType",
      headerName: "Subscription Type",
      flex: 1.3,
      sortable: true,
      valueGetter: (params) => {
        const type = params.row?.onboardingType || "";
        if (type === "someoneelse") return "Someone else";
        if (type === "individual") return "Individual";
        if (type === "family") return "Family";
        return type;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params: any) => (
        <button
          onClick={() => {
            navigate(`/view-induction`);
            dispatch(setSelectedInduction(params.row));
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="View Details"
        >
          <svg
            className="w-5 h-5 text-gray-600 hover:text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      ),
    },
  ];

  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        title="Induction"
        search={false}
        description="Manage your induction process."
        inputPlaceholder="Search induction..."
        value={searchTerm}
        onSearch={setSearchTerm}
      />

      {/* Date Filter */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label
          htmlFor="induction-date"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Select Date:
        </label>
        <input
          id="induction-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table Wrapper for Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto">
        <UserTable
        data={inductionListData?.bookings}
        columns={inductionColumns}
        selectedItem={null}
        onSelectItem={() => {}}
        loading={isLoading}
        emptyState={{
          icon: (
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
          title: "No induction found",
          subtitle: "Try adjusting your search criteria",
        }}
      />
      </div>
    </div>
  );
};

export default Induction;
