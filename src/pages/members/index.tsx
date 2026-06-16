import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { buildRoute } from '../../constants/routes';
import { getLocalUser } from '../../constants/user';
import { decodeToken } from '../../helpers';
import { getMembers, getMembersCount } from '../../store/members/api';
import { MemberRequest } from '../../store/members/types';
import { AppDispatch, RootState } from '../../store/store';

const user_svg = '/assets/user.svg';

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

function parseFiltersFromSearchParams(searchParams: URLSearchParams): FilterState {
  return {
    email: searchParams.get('email') ?? '',
    billingCycle: (searchParams.get('billingCycle') as FilterState['billingCycle']) ?? '',
    subscriptionType: (searchParams.get('subscriptionType') as FilterState['subscriptionType']) ?? '',
    status: (searchParams.get('status') as FilterState['status']) ?? '',
  };
}

function filtersToSearchParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.email.trim()) params.email = filters.email.trim();
  if (filters.billingCycle) params.billingCycle = filters.billingCycle;
  if (filters.subscriptionType) params.subscriptionType = filters.subscriptionType;
  if (filters.status) params.status = filters.status;
  return params;
}

const planConfig: Record<string, { label: string; color: string; dot: string }> = {
  standard: { label: 'Standard', color: 'text-blue-700', dot: 'bg-blue-500' },
  premium: { label: 'Premium', color: 'text-purple-700', dot: 'bg-purple-500' },
  family: { label: 'Family', color: 'text-pink-700', dot: 'bg-pink-500' },
  offpeak: { label: 'Offpeak', color: 'text-orange-700', dot: 'bg-orange-500' },
};

const subscriptionStatusMap: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  pendingactivation: { label: 'Pending Activation', className: 'bg-yellow-100 text-yellow-700' },
  paused: { label: 'On Hold', className: 'bg-orange-100 text-orange-600' },
  canceled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  resumed: { label: 'Resumed', className: 'bg-indigo-100 text-indigo-700' },
  inactive: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  past_due: { label: 'Payment Failed', className: 'bg-orange-100 text-orange-700' },
};

const Members = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { membersList: membersListData, isLoading, membersCount } = useSelector((state: RootState) => state.members);

  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromSearchParams(searchParams));

  const membersColumns: ColumnDef[] = useMemo(
    () => [
      {
        field: 'sno',
        headerName: 'S.No',
        flex: 0.5,
        minWidth: 60,
        sortable: false,
        renderCell: (params: any) => {
          const currentSkip = membersListData.skip || 0;
          return <span className="text-[13px] font-medium text-gray-400">{currentSkip + params.index + 1}</span>;
        },
        valueGetter: (params: any) => {
          const currentSkip = membersListData.skip || 0;
          return currentSkip + params.index + 1;
        },
      },
      {
        field: 'name',
        headerName: 'Member',
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
                className={`h-9 w-9 rounded-full border border-gray-200 object-cover ${isDefaultImage ? 'p-1.5' : ''}`}
                src={imageUrl}
                onError={e => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                }}
              />
              <div>
                <p className="text-[13px] font-semibold text-[#21295A]">{fullName}</p>
                <p className="text-[11px] text-gray-400">{params.row?.email || ''}</p>
              </div>
            </div>
          );
        },
        valueGetter: params => {
          return `${params.row?.firstName} ${params.row?.lastName}`.trim();
        },
      },
      {
        field: 'Billing Cycle',
        headerName: 'Billing',
        flex: 0.9,
        minWidth: 120,
        sortable: false,
        renderCell: (params: any) => {
          const cycle = params.row?.billingCycle || '';
          const label = cycle === 'fortnightly' ? 'Fortnightly' : cycle === 'annual' ? 'Annual' : cycle;
          return (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-600">{label}</span>
          );
        },
        valueGetter: params => {
          const billingCycle = params.row?.billingCycle || '';
          if (billingCycle === 'fortnightly') return 'Fortnightly';
          if (billingCycle === 'annual') return 'Annual';
          return billingCycle;
        },
      },
      {
        field: 'Subscription Type',
        headerName: 'Plan',
        flex: 0.9,
        minWidth: 120,
        sortable: false,
        renderCell: (params: any) => {
          const type = params.row?.subscriptionCode || '';
          const cfg = planConfig[type];
          if (!cfg) return <span className="text-[13px] text-gray-500">{type}</span>;
          return (
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              <span className={`text-[13px] font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
          );
        },
        valueGetter: params => {
          const type = params.row?.subscriptionCode || '';
          return planConfig[type]?.label || type;
        },
      },
      {
        field: 'Subscription Status',
        headerName: 'Status',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: (params: any) => {
          const type = params.row?.subscriptionStatus || '';
          const { label, className } = subscriptionStatusMap[type] || {
            label: type,
            className: 'bg-gray-100 text-gray-600',
          };
          return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{label}</span>;
        },
      },
      {
        field: 'Cycle Limits',
        headerName: 'Slots Used / Total',
        flex: 1,
        minWidth: 140,
        sortable: false,
        renderCell: (params: any) => {
          const used = params.row?.cycleLimits?.used ?? '-';
          const total = params.row?.cycleLimits?.total ?? '-';
          const pct = total && total !== '-' && used !== '-' ? Math.round((used / total) * 100) : null;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-[#21295A]">
                {used} <span className="font-normal text-gray-400">/ {total}</span>
              </span>
              {pct !== null && (
                <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#21295A] transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        },
        valueGetter: params => {
          const used = params.row?.cycleLimits?.used ?? '';
          const total = params.row?.cycleLimits?.total ?? '';
          return `${used} / ${total}`;
        },
      },
      {
        field: 'actions',
        headerName: '',
        flex: 0.6,
        minWidth: 80,
        sortable: false,
        renderCell: (params: any) => {
          return (
            <button
              className="rounded-lg border border-[#21295A]/20 bg-[#21295A]/5 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition-all hover:bg-[#21295A] hover:text-white"
              title="View member details"
              onClick={e => {
                e.stopPropagation();
                navigate(buildRoute.viewMembers(params.row.userId), { state: { listSearch: location.search } });
              }}
            >
              View
            </button>
          );
        },
      },
    ],
    [membersListData.skip, navigate, location.search]
  );

  const currentLimit = membersListData.limit || 20;

  const buildRequestPayload = useCallback(
    (overrides?: Partial<MemberRequest>, appliedFilters: FilterState = filters): MemberRequest => {
      const limit = overrides?.limit ?? (membersListData.limit || 15);
      const payload: MemberRequest = {
        skip: overrides?.skip ?? 0,
        limit,
        facilityCode: getLocalUser().facilityCode,
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
    },
    [filters, membersListData.limit]
  );

  const facilityCode = decodeToken()?.facilityCode;

  useEffect(() => {
    setFilters(parseFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const applied = parseFiltersFromSearchParams(searchParams);
    const payload: MemberRequest = {
      skip: 0,
      limit: currentLimit,
      facilityCode: getLocalUser().facilityCode,
    };
    const trimmedEmail = applied.email.trim();
    if (trimmedEmail) payload.email = trimmedEmail;
    if (applied.billingCycle) payload.billingCycle = applied.billingCycle;
    if (applied.subscriptionType) payload.subscriptionCode = applied.subscriptionType;
    if (applied.status) payload.subscriptionStatus = applied.status;
    dispatch(getMembers(payload));
  }, [dispatch, currentLimit, facilityCode, searchParams]);

  useEffect(() => {
    dispatch(
      getMembersCount({
        facilityCode: facilityCode || '',
      })
    );
  }, [dispatch, facilityCode]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    const params = filtersToSearchParams(filters);
    setSearchParams(params, { replace: true });
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setSearchParams({}, { replace: true });
    dispatch(getMembers(buildRequestPayload({ skip: 0 }, defaultFilters)));
  };

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Members</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">Manage subscriptions and member accounts · HOU01</p>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      {membersCount && (
        <div className="mb-5 grid grid-cols-5 gap-3">
          {/* Section label — Subscription Overview */}
          <p className="col-span-5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Subscription Overview
          </p>

          <div className="flex flex-col gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Total</p>
            <p className="text-[22px] font-bold text-indigo-700">{membersCount.total.toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-green-600">Active</p>
            <p className="text-[22px] font-bold text-green-700">{membersCount.activeMembersCount.toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">Cancelled</p>
            <p className="text-[22px] font-bold text-red-600">{membersCount.inactiveMembersCount.toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Pending</p>
            <p className="text-[22px] font-bold text-amber-700">
              {membersCount.pendingActivationCount.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-500">On Hold</p>
            <p className="text-[22px] font-bold text-orange-600">{(membersCount.pausedCount ?? 0).toLocaleString()}</p>
          </div>

          {/* Section label — Subscription Plans */}
          <p className="col-span-5 mt-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Subscription Plans
          </p>

          {[
            { key: 'standard', annual: membersCount.standardAnnual, fortnightly: membersCount.standardFortnightly },
            { key: 'premium', annual: membersCount.premiumAnnual, fortnightly: membersCount.premiumFortnightly },
            { key: 'family', annual: membersCount.familyAnnual, fortnightly: membersCount.familyFortnightly },
            { key: 'offpeak', annual: membersCount.offpeakAnnual, fortnightly: membersCount.offpeakFortnightly },
          ].map(plan => {
            const cfg = planConfig[plan.key];
            const total = (plan.annual ?? 0) + (plan.fortnightly ?? 0);
            return (
              <div
                key={plan.key}
                className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  <p className={`text-[10px] font-semibold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
                </div>
                <p className="text-[22px] font-bold text-[#21295A]">{total.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">
                  {plan.annual ?? 0} annual · {plan.fortnightly ?? 0} fortnightly
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Email */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="filter-email"
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
                  id="filter-email"
                  placeholder="Search by email…"
                  type="text"
                  value={filters.email}
                  onChange={e => handleFilterChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Billing Cycle */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="filter-billing-cycle"
              >
                Billing Cycle
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="filter-billing-cycle"
                value={filters.billingCycle}
                onChange={e => handleFilterChange('billingCycle', e.target.value)}
              >
                <option value="">All Cycles</option>
                <option value="annual">Annual</option>
                <option value="fortnightly">Fortnightly</option>
              </select>
            </div>

            {/* Subscription Type */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="filter-plan"
              >
                Plan
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="filter-plan"
                value={filters.subscriptionType}
                onChange={e => handleFilterChange('subscriptionType', e.target.value)}
              >
                <option value="">All Plans</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
                <option value="offpeak">Offpeak</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="filter-status"
              >
                Status
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="filter-status"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pendingactivation">Pending Activation</option>
                <option value="paused">On Hold</option>
                <option value="past_due">Payment Failed</option>
                <option value="canceled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
              onClick={handleClearFilters}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
              disabled={isLoading}
              onClick={handleApplyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Members Table ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
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
            if (newSkip !== membersListData.skip) {
              dispatch(getMembers(buildRequestPayload({ skip: newSkip })));
            }
          }}
          onRowClick={(row: any) => {
            navigate(buildRoute.viewMembers(row.userId), { state: { listSearch: location.search } });
          }}
          onRowsPerPageChange={(rowsPerPage: number) => {
            dispatch(getMembers(buildRequestPayload({ limit: rowsPerPage, skip: 0 })));
          }}
        />
      </div>
    </div>
  );
};

export default Members;
