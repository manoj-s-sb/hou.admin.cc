import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { getMembers } from '../../store/members/api';
import { MemberRequest } from '../../store/members/types';
import { AppDispatch, RootState } from '../../store/store';

const user_svg = '/assets/user.svg';

const Members = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { membersList: membersListData, isLoading } = useSelector((state: RootState) => state.members);
  type FilterState = {
    email: string;
    billingCycle: '' | NonNullable<MemberRequest['billingCycle']>;
    subscriptionType: '' | NonNullable<MemberRequest['subscriptionCode']>;
    status: '' | NonNullable<MemberRequest['subscriptionStatus']>;
  };
  const defaultFilters: FilterState = {
    email: '',
    billingCycle: '',
    subscriptionType: '',
    status: '',
  };
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const membersColumns: ColumnDef[] = [
    {
      field: 'sno',
      headerName: 'S.No',
      flex: 0.5,
      minWidth: 80,
      sortable: false,
      renderCell: (params: any) => {
        const currentSkip = membersListData.skip || 0;
        return <span className="font-medium text-gray-600">{currentSkip + params.index + 1}</span>;
      },
      valueGetter: (params: any) => {
        const currentSkip = membersListData.skip || 0;
        return currentSkip + params.index + 1;
      },
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: (params: any) => {
        const imageUrl = params.row?.profileImageUrl || user_svg;
        const isDefaultImage = !params.row?.profileImageUrl;
        const fullName = `${params.row?.firstName} ${params.row?.lastName}`.trim();
        return (
          <div className="flex items-center gap-3">
            <img
              alt="Profile"
              className={`h-11 w-11 rounded-full border-2 object-cover ${isDefaultImage ? 'p-2' : ''}`}
              src={imageUrl}
              onError={e => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
              }}
            />
            <span className="font-semibold text-gray-900">{fullName}</span>
          </div>
        );
      },
      valueGetter: params => {
        return `${params.row?.firstName} ${params.row?.lastName}`.trim();
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 200,
      sortable: false,
      valueGetter: params => {
        return params.row?.email || '';
      },
    },
    {
      field: 'Billing Cycle',
      headerName: 'Billing Cycle',
      flex: 1.3,
      minWidth: 170,
      sortable: false,
      valueGetter: params => {
        const billingCycle = params.row?.billingCycle || '';
        if (billingCycle === 'fortnightly') return 'Fortnightly';
        if (billingCycle === 'annual') return 'Annual';
        return billingCycle;
      },
    },
    {
      field: 'Subscription Type',
      headerName: 'Subscription Type',
      flex: 1,
      minWidth: 170,
      sortable: false,
      valueGetter: params => {
        const type = params.row?.subscriptionCode || '';
        if (type === 'standard') return 'Standard';
        if (type === 'premium') return 'Premium';
        if (type === 'family') return 'Family';
        if (type === 'offpeak') return 'Offpeak';
        return type;
      },
    },
    {
      field: 'Subscription Status',
      headerName: 'Subscription Status',
      flex: 1.3,
      minWidth: 170,
      sortable: false,
      valueGetter: params => {
        const type = params.row?.subscriptionStatus || '';
        if (type === 'pendingactivation') return 'Activation Pending';
        if (type === 'active') return 'Active';
        if (type === 'paused') return 'Paused';
        if (type === 'canceled') return 'Cancelled';
        if (type === 'resumed') return 'Resumed';
        if (type === 'inactive') return 'Inactive';
        return type;
      },
    },
    {
      field: 'Cycle Limits',
      headerName: 'Slots Cycle Limits',
      flex: 1.3,
      minWidth: 170,
      sortable: false,
      valueGetter: params => {
        return params.row?.cycleLimits || '';
      },
      renderCell: (params: any) => {
        const used = params.row?.cycleLimits?.used ?? '-';
        const total = params.row?.cycleLimits?.total ?? '-';
        return <span className="font-medium text-gray-600">{`${used} / ${total}`}</span>;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (params: any) => {
        return (
          <button
            className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm transition-all duration-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-md"
            title="View member details"
            onClick={e => {
              e.stopPropagation();
              navigate(`/members/${params.row.userId}`);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              <path
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span className="hidden sm:inline">View</span>
          </button>
        );
      },
    },
  ];

  const currentLimit = membersListData.limit || 20;

  const buildRequestPayload = (
    overrides?: Partial<MemberRequest>,
    appliedFilters: FilterState = filters
  ): MemberRequest => {
    const limit = overrides?.limit ?? (membersListData.limit || 15);
    const payload: MemberRequest = {
      skip: overrides?.skip ?? 0,
      limit,
      facilityCode: 'HOU01',
    };

    const trimmedEmail = appliedFilters.email.trim();
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }
    if (appliedFilters.billingCycle) {
      payload.billingCycle = appliedFilters.billingCycle;
    }
    if (appliedFilters.subscriptionType) {
      payload.subscriptionCode = appliedFilters.subscriptionType;
    }
    if (appliedFilters.status) {
      payload.subscriptionStatus = appliedFilters.status;
    }

    return payload;
  };

  useEffect(() => {
    dispatch(
      getMembers({
        skip: 0,
        limit: currentLimit,
        facilityCode: 'HOU01',
      })
    );
  }, [dispatch, currentLimit]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    dispatch(getMembers(buildRequestPayload({ skip: 0 })));
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    dispatch(getMembers(buildRequestPayload({ skip: 0 }, defaultFilters)));
  };

  // Calculate member statistics
  // const memberStats = useMemo(() => {
  //   const members = membersListData.members || [];
  //   const total = membersListData.total || 0;

  //   // Calculate active and inactive counts (using flattened structure as per column definitions)
  //   const active = members.filter(m => {
  //     const status = (m as any).subscriptionStatus || m.subscription?.subscriptionStatus;
  //     return status === 'active';
  //   }).length;
  //   const inactive = members.filter(m => {
  //     const status = (m as any).subscriptionStatus || m.subscription?.subscriptionStatus;
  //     return status === 'inactive';
  //   }).length;

  //   // Calculate subscription type counts (using flattened structure as per column definitions)
  //   const standard = members.filter(m => {
  //     const code = (m as any).subscriptionCode || m.subscription?.subscriptionCode;
  //     return code === 'standard';
  //   }).length;
  //   const premium = members.filter(m => {
  //     const code = (m as any).subscriptionCode || m.subscription?.subscriptionCode;
  //     return code === 'premium';
  //   }).length;
  //   const family = members.filter(m => {
  //     const code = (m as any).subscriptionCode || m.subscription?.subscriptionCode;
  //     return code === 'family';
  //   }).length;
  //   const offpeak = members.filter(m => {
  //     const code = (m as any).subscriptionCode || m.subscription?.subscriptionCode;
  //     return code === 'offpeak';
  //   }).length;

  //   return {
  //     total,
  //     active,
  //     inactive,
  //     standard,
  //     premium,
  //     family,
  //     offpeak,
  //   };
  // }, [membersListData]);

  return (
    <div className="w-full">
      <SectionTitle
        description="View and manage all member subscriptions and account details"
        inputPlaceholder=""
        search={false}
        title="Members & Subscriptions"
        value=""
      />

      <div className="mb-8">
        {/* <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4"> */}
        {/* Filters Section - Left Side */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-base font-semibold text-gray-900">Filters</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600" htmlFor="member-email-filter">
                Email
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                id="member-email-filter"
                placeholder="Search members by email"
                type="text"
                value={filters.email}
                onChange={e => handleFilterChange('email', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600" htmlFor="member-billing-cycle-filter">
                Billing Cycle
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                id="member-billing-cycle-filter"
                value={filters.billingCycle}
                onChange={e => handleFilterChange('billingCycle', e.target.value)}
              >
                <option value="">All</option>
                <option value="annual">Annual</option>
                <option value="fortnightly">Fortnightly</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600" htmlFor="member-subscription-type-filter">
                Subscription Type
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                id="member-subscription-type-filter"
                value={filters.subscriptionType}
                onChange={e => handleFilterChange('subscriptionType', e.target.value)}
              >
                <option value="">All</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
                <option value="offpeak">Offpeak</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600" htmlFor="member-status-filter">
                Status
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                id="member-status-filter"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="pendingactivation">Pending Activation</option>
                <option value="paused">Paused</option>
                <option value="past_due">Payment Failed</option>
                <option value="canceled">Cancelled</option>
                <option value="resumed">Resumed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
              type="button"
              onClick={handleClearFilters}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              type="button"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Statistics Section - Right Side */}
        {/* <div className="flex w-full flex-row gap-3 lg:col-span-2"> */}
        {/* Members Statistics Card */}
        {/* <div className="group relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300"> */}
        {/* Gradient Background */}
        {/* <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 opacity-10 blur-3xl transition-all duration-300 group-hover:scale-150"></div> */}

        {/* <div className="relative"> */}
        {/* <div className="mb-3"> */}
        {/* <h3 className="mb-1 text-xs font-semibold text-gray-600">Total Members</h3> */}
        {/* <p className="text-3xl font-bold text-gray-900">{memberStats.total.toLocaleString()}</p> */}
        {/* </div> */}
        {/* <div className="space-y-1.5 border-t border-gray-100 pt-3"> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-green-500"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Active</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.active.toLocaleString()}</span> */}
        {/* </div> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-gray-400"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Inactive</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.inactive.toLocaleString()}</span> */}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}

        {/* Subscriptions Statistics Card */}
        {/* <div className="group relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300"> */}
        {/* Gradient Background */}
        {/* <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 opacity-10 blur-3xl transition-all duration-300 group-hover:scale-150"></div> */}

        {/* <div className="relative"> */}
        {/* <div className="mb-3"> */}
        {/* <h3 className="mb-1 text-xs font-semibold text-gray-600">Subscriptions</h3> */}
        {/* <p className="text-3xl font-bold text-gray-900"> */}
        {/* {( */}
        {/* memberStats.standard + */}
        {/* memberStats.premium + */}
        {/* memberStats.family + */}
        {/* memberStats.offpeak */}
        {/* ).toLocaleString()} */}
        {/* </p> */}
        {/* </div> */}
        {/* <div className="space-y-1.5 border-t border-gray-100 pt-3"> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-blue-500"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Standard</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.standard.toLocaleString()}</span> */}
        {/* </div> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-purple-500"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Premium</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.premium.toLocaleString()}</span> */}
        {/* </div> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-pink-500"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Family</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.family.toLocaleString()}</span> */}
        {/* </div> */}
        {/* <div className="flex items-center justify-between"> */}
        {/* <div className="flex items-center gap-2"> */}
        {/* <div className="h-2 w-2 rounded-full bg-orange-500"></div> */}
        {/* <span className="text-sm font-medium text-gray-600">Offpeak</span> */}
        {/* </div> */}
        {/* <span className="text-sm font-bold text-gray-900">{memberStats.offpeak.toLocaleString()}</span> */}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
      </div>

      <div>
        <DataTable
          columns={membersColumns.map(col => ({
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
          }))}
          data={membersListData.members}
          getRowId={(row: any) => row.userId}
          loading={isLoading}
          page={Math.floor(membersListData.skip / (membersListData.limit || 15))}
          rowsPerPage={membersListData.limit || 15}
          serverSide={true}
          totalRows={membersListData.total}
          onPageChange={(page: number) => {
            const limit = membersListData.limit || 15;
            const newSkip = page * limit;
            // Only dispatch if skip actually changed
            if (newSkip !== membersListData.skip) {
              dispatch(getMembers(buildRequestPayload({ skip: newSkip })));
            }
          }}
          onRowClick={(row: any) => {
            navigate(`/members/${row.userId}`);
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            // When changing rows per page, reset to first page
            dispatch(getMembers(buildRequestPayload({ limit: rowsPerPage, skip: 0 })));
          }}
        />
      </div>
    </div>
  );
};

export default Members;
