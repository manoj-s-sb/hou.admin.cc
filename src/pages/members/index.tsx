import SectionTitle from "../../components/SectionTitle";
import UserTable, { ColumnDef } from "../../components/UserTable";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { useEffect } from "react";
import { getMembers } from "../../store/members/api";
import { useNavigate } from "react-router-dom";

const Members = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { membersList: membersListData, isLoading } = useSelector(
    (state: RootState) => state.members,
  );

  const membersColumns: ColumnDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 2,
      sortable: true,
      renderCell: (params: any) => {
        const imageUrl = params.row?.profileImageUrl;
        const fullName =
          `${params.row?.firstName} ${params.row?.lastName}`.trim();
        return (
          <div className="flex items-center gap-3">
            <img
              src={imageUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/40";
              }}
            />
            <span>{fullName}</span>
          </div>
        );
      },
      valueGetter: (params) => {
        return `${params.row?.firstName} ${params.row?.lastName}`.trim();
      },
    },
    {
      field: "email",
      headerName: "Email",
      flex: 2,
      sortable: false,
      valueGetter: (params) => {
        return params.row?.email || "";
      },
    },
    {
      field: "Subscription Type",
      headerName: "Subscription Type",
      flex: 1.5,
      sortable: false,
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
      flex: 0.5,
      sortable: false,
      renderCell: (params: any) => {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/members/${params.row.userId}`);
            }}
            className="flex items-center justify-center p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View member details"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        );
      },
    },
  ];

  useEffect(() => {
    dispatch(
      getMembers({
        skip: 0,
        limit: 15,
        facilityCode: "HOU01",
      }),
    );
  }, [dispatch]);

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        title="Subscriptions"
        description="Manage your subscriptions."
        inputPlaceholder="Search subscription..."
        value=""
        onSearch={() => {}}
      />

      <UserTable
        data={membersListData.members}
        columns={membersColumns}
        selectedItem={null}
        onSelectItem={() => {}}
        loading={isLoading}
        totalItems={membersListData.total}
        itemsPerPage={membersListData.limit}
        currentPage={membersListData.skip}
        onPageChange={(skip) => {
          dispatch(
            getMembers({
              skip,
              limit: membersListData.limit,
              facilityCode: "HOU01",
            }),
          );
        }}
      />
    </div>
  );
};

export default Members;
