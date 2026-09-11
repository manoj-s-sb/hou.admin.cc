import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import DataTable from '../../components/Table/DataTable';
import { ColumnDef, TableColumn } from '../../components/Table/types';
import { buildRoute, ROUTES } from '../../constants/routes';
import { getStaffConfig, getStaffList, setStaffStatus } from '../../store/staff/api';
import { type AppDispatch, type RootState } from '../../store/store';

import { GENERIC_ROLE_ICON, ROLE_ICON_MAP } from './constants';
import { useCentreLookup } from './useCentreLookup';
import { buildStaffListParams, formatRoleLabel } from './utils';

import type { StaffListRow } from '../../store/staff/types';

type TabKey = 'all' | 'designations' | 'access';

interface StaffRow {
  id: string;
  initials: string;
  initialsBg: string;
  photoUrl: string;
  name: string;
  subtitle: string;
  primaryRoles: { label: string; tone?: 'primary' | 'muted' }[];
  accessLevel: { label: string; tone: 'admin' | 'facility' | 'global' };
  centres: string;
  twoFa: 'on' | 'off';
  documents: { count: number; tone: 'green' | 'red' | 'amber' };
  status: 'active' | 'invited' | 'draft' | 'inactive';
  raw: StaffListRow;
}

const accessToneClass: Record<StaffRow['accessLevel']['tone'], string> = {
  admin: 'text-blue-600',
  facility: 'text-emerald-600',
  global: 'bg-gray-800 text-white px-2 py-0.5 rounded-md inline-block',
};

const statusToneClass: Record<StaffRow['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'text-emerald-600' },
  invited: { label: 'Invited', className: 'text-amber-600' },
  draft: { label: 'Draft', className: 'text-red-500' },
  inactive: { label: 'Inactive', className: 'text-gray-500' },
};

const docToneClass: Record<StaffRow['documents']['tone'], string> = {
  green: 'text-emerald-600',
  red: 'text-red-500',
  amber: 'text-amber-600',
};

const TABS: { key: TabKey; label: string; badge?: string }[] = [
  { key: 'all', label: 'All Staff' },
  { key: 'designations', label: 'Designations' },
  { key: 'access', label: 'Access Levels' },
];

// Feature areas teased in the (locked) Part-2 permission matrix.
const MATRIX_FEATURES = [
  'Members & Subscriptions',
  'Bookings & Inductions',
  'Coach Scheduling',
  'Maintenance & Facilities',
  'Staff Management',
  'Reports & Analytics',
  'Centre Configuration',
  'Master Screen',
];

type Grant = 'full' | 'partial' | 'none';

// Illustrative permission pattern for the teaser — real matrix lands in Part 2.
const matrixGrant = (scopeType: string, levelId: string, rowIndex: number): Grant => {
  if (scopeType === 'all') return 'full'; // global — everything
  if (rowIndex === MATRIX_FEATURES.length - 1) return 'none'; // Master Screen — global only
  if (levelId === 'admin') return rowIndex === MATRIX_FEATURES.length - 2 ? 'partial' : 'full';
  if (rowIndex <= 3) return 'full';
  if (rowIndex <= 5) return 'partial';
  return 'none';
};

const INITIALS_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

const pickInitialsBg = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % INITIALS_PALETTE.length;
  return INITIALS_PALETTE[hash];
};

const accessTone = (level: string | null): StaffRow['accessLevel']['tone'] => {
  if (!level) return 'admin';
  const v = level.toLowerCase();
  if (v.includes('global')) return 'global';
  if (v.includes('facility')) return 'facility';
  return 'admin';
};

const normalizeStatus = (status: string): StaffRow['status'] => {
  const v = status?.toLowerCase();
  if (v === 'invited') return 'invited';
  if (v === 'draft') return 'draft';
  // Treat legacy 'suspended' as 'inactive' so both render the same.
  if (v === 'inactive' || v === 'suspended') return 'inactive';
  return 'active';
};

const mapStaff = (
  row: StaffListRow,
  resolveCentres: (codes: string[] | null | undefined, fallback?: string | null) => string,
  resolveAccessLabel: (code: string | null) => string
): StaffRow => {
  const fullName = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
  const displayName = fullName || row.email?.split('@')[0] || 'Staff Member';
  const initialsSource = fullName || row.email || '?';
  const initials =
    initialsSource
      .split(/\s+|@|\./)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';

  const roles = (row.userType ?? []).map(role => ({ label: formatRoleLabel(role) }));

  const centres = resolveCentres(row.assignedCentres, row.facilityCode);

  return {
    id: row.staffId,
    initials,
    initialsBg: pickInitialsBg(row.staffId || row.email || displayName),
    photoUrl:
      row.photoSasUrl ??
      row.photoUrl ??
      row.profileImageUrl ??
      (row as { staffProfile?: { photoSasUrl?: string } }).staffProfile?.photoSasUrl ??
      '',
    name: displayName,
    subtitle: row.email,
    primaryRoles: roles,
    accessLevel: {
      label: resolveAccessLabel(row.accessLevel),
      tone: accessTone(row.accessLevel),
    },
    centres,
    twoFa: row.twoFactorAuth ? 'on' : 'off',
    documents: {
      count: row.documentCount ?? 0,
      tone: (row.documentCount ?? 0) > 0 ? 'green' : 'red',
    },
    status: normalizeStatus(row.status),
    raw: row,
  };
};

const StaffManagement: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Defaults to "active" so the screen opens showing only active staff — switch
  // to Inactive/All to see everyone else. "Inactive" covers suspended staff too:
  // the backend only ever writes 'active' or 'suspended' (see handleToggleStatus),
  // and normalizeStatus already collapses 'suspended' into the same "Inactive"
  // bucket the Status column displays — so there's no separate "Suspended" option.
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited' | 'inactive'>('active');
  const { staffList, isListLoading, listError, staffConfig, isConfigLoading, configError } = useSelector(
    (state: RootState) => state.staff
  );
  const centreLookup = useCentreLookup();

  // Access-level code → human label. Prefers the configured label from staff
  // config; falls back to a humanized version of the raw code.
  const accessLabelOf = useCallback(
    (code: string | null): string => {
      if (!code) return '—';
      const match = (staffConfig?.accessLevels ?? []).find(a => a.id.toLowerCase() === code.toLowerCase());
      if (match?.label) return match.label;
      return code
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    },
    [staffConfig]
  );

  const loadStaff = useCallback(() => {
    dispatch(getStaffList(buildStaffListParams()));
  }, [dispatch]);

  useEffect(() => {
    loadStaff();
    // Config (roles + access levels) is cached by the thunk, so this is a no-op once loaded.
    dispatch(getStaffConfig());
  }, [dispatch, loadStaff]);

  const staff: StaffRow[] = useMemo(
    () => staffList.map(row => mapStaff(row, centreLookup.text, accessLabelOf)),
    [staffList, centreLookup.text, accessLabelOf]
  );

  const filteredStaff: StaffRow[] = useMemo(() => {
    if (statusFilter === 'all') return staff;
    return staff.filter(s => s.status === statusFilter);
  }, [staff, statusFilter]);

  const isLoading = isListLoading;
  const error = listError;

  // Suspend → 'inactive' (deactivated in DB); Reactivate/Activate → 'active'. An
  // invited-but-not-yet-active member can't be suspended, so they get an Activate
  // action instead. Reuses the shared thunk so the full record is preserved and
  // login can be blocked server-side.
  const handleToggleStatus = async (row: StaffRow) => {
    const isInactive = row.status === 'inactive';
    const isInvited = row.status === 'invited';
    // Backend's deactivated value is 'suspended' (shown as "Inactive" in the UI).
    const nextStatus: 'active' | 'suspended' = isInactive || isInvited ? 'active' : 'suspended';
    const verb = isInactive ? 'reactivate' : isInvited ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${verb} ${row.name}?`)) return;

    setTogglingId(row.id);
    const action = await dispatch(setStaffStatus({ staffId: row.id, status: nextStatus }));
    setTogglingId(null);

    if (setStaffStatus.fulfilled.match(action)) {
      toast.success(
        isInactive ? 'Staff member reactivated' : isInvited ? 'Staff member activated' : 'Staff member suspended'
      );
      loadStaff();
    } else {
      toast.error((action.payload as string) ?? `Failed to ${verb} staff member`);
    }
  };

  // Staff count per designation = number of staff whose userType includes the role id.
  const staffCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    staffList.forEach(member => {
      (member.userType ?? []).forEach(roleId => {
        counts[roleId] = (counts[roleId] ?? 0) + 1;
      });
    });
    return counts;
  }, [staffList]);

  const designationRows = useMemo(
    () =>
      (staffConfig?.roles ?? []).map(role => ({
        id: role.id,
        label: role.label,
        description: role.description,
        iconBg: role.iconBg,
        iconColor: role.iconColor,
        isActive: role.isActive,
        staffCount: staffCountByRole[role.id] ?? 0,
      })),
    [staffConfig, staffCountByRole]
  );

  const openProfile = (row: StaffRow) => navigate(buildRoute.viewStaffMember(row.id), { state: { staff: row.raw } });

  const staffColumns: ColumnDef[] = [
    {
      field: 'sno',
      headerName: 'S.No',
      flex: 0.5,
      minWidth: 60,
      sortable: false,
      renderCell: ({ index }) => <span className="text-[13px] font-medium text-gray-400">{index + 1}</span>,
    },
    {
      field: 'name',
      headerName: 'Staff Member',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <button
          className="flex items-center gap-3 text-left transition hover:opacity-80"
          type="button"
          onClick={e => {
            e.stopPropagation();
            openProfile(row);
          }}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold ${row.photoUrl ? 'bg-gray-100' : row.initialsBg}`}
          >
            {row.photoUrl ? (
              <img alt={row.name} className="h-full w-full object-cover" src={row.photoUrl} />
            ) : (
              row.initials
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#21295A] hover:underline">{row.name}</p>
            <p className="text-[11px] text-gray-400">{row.subtitle}</p>
          </div>
        </button>
      ),
    },
    {
      field: 'primaryRoles',
      headerName: 'Primary Roles',
      flex: 1.2,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {(row as StaffRow).primaryRoles.map((role, idx) => (
            <span
              key={idx}
              className={`text-[12px] font-medium ${
                role.tone === 'muted' ? 'rounded-md bg-gray-100 px-2 py-0.5 text-gray-600' : 'text-gray-700'
              }`}
            >
              {role.label}
            </span>
          ))}
        </div>
      ),
    },
    {
      field: 'accessLevel',
      headerName: 'Access Level',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }) => {
        const r = row as StaffRow;
        return (
          <span className={`text-[12px] font-semibold ${accessToneClass[r.accessLevel.tone]}`}>
            {r.accessLevel.label}
          </span>
        );
      },
    },
    {
      field: 'centres',
      headerName: 'Centres',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }) => <span className="text-[12px] text-gray-700">{row.centres}</span>,
    },
    {
      field: 'documents',
      headerName: 'Documents',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => {
        const r = row as StaffRow;
        return (
          <button
            className={`text-[12px] font-semibold underline-offset-2 transition hover:underline ${docToneClass[r.documents.tone]}`}
            type="button"
            onClick={e => {
              e.stopPropagation();
              openProfile(r);
            }}
          >
            {r.documents.count} uploaded
          </button>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 100,
      sortable: false,
      renderCell: ({ row }) => {
        const status = statusToneClass[(row as StaffRow).status];
        return <span className={`text-[12px] font-semibold ${status.className}`}>{status.label}</span>;
      },
    },
    {
      field: 'actions',
      headerName: 'Action',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[11.5px] font-semibold text-gray-700 shadow-sm transition hover:border-[#21295A] hover:text-[#21295A]"
            type="button"
            onClick={e => {
              e.stopPropagation();
              navigate(buildRoute.editStaffMember(row.id));
            }}
          >
            Edit
          </button>
          {(() => {
            const r = row as StaffRow;
            const isInactive = r.status === 'inactive';
            const isInvited = r.status === 'invited';
            const isActivateAction = isInactive || isInvited;
            return (
              <button
                className={`rounded-md border px-3 py-1 text-[11.5px] font-semibold shadow-sm transition disabled:opacity-50 ${
                  isActivateAction
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                disabled={togglingId === r.id}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleToggleStatus(r);
                }}
              >
                {togglingId === r.id ? 'Updating…' : isInactive ? 'Reactivate' : isInvited ? 'Activate' : 'Suspend'}
              </button>
            );
          })()}
        </div>
      ),
    },
  ];

  const designationColumns: ColumnDef[] = [
    {
      field: 'label',
      headerName: 'Designation',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: row.iconBg, color: row.iconColor }}
          >
            {ROLE_ICON_MAP[row.id] ?? GENERIC_ROLE_ICON}
          </span>
          <div>
            <p className="text-[13px] font-bold text-[#21295A]">{row.label}</p>
            <p className="line-clamp-1 max-w-[260px] text-[11px] text-gray-400">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      field: 'staffCount',
      headerName: 'Staff Count',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) => <span className="text-[13px] font-semibold text-[#21295A]">{row.staffCount}</span>,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: ({ row }) =>
        row.isActive ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
            Active
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#21295A]">Staff Management</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-500">
            Add staff members, assign roles, access levels, and centre permissions.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
          onClick={() => navigate(ROUTES.STAFF_MANAGEMENT_ADD.path)}
        >
          <span className="text-[14px] leading-none"></span>
          Add Staff Member
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-6 border-b border-gray-200">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`relative flex items-center gap-1.5 pb-2.5 text-[13px] font-semibold transition ${
                isActive ? 'text-[#21295A]' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                  {tab.badge}
                </span>
              )}
              {isActive && <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[#21295A]" />}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {activeTab === 'all' && (
        <>
          {!isLoading && error && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {error}
            </div>
          )}
          <div className="mb-3 flex items-center justify-end">
            <label
              className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              htmlFor="staff-status-filter"
            >
              Status
            </label>
            <select
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
              id="staff-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="invited">Invited</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <DataTable
              columns={staffColumns.map(
                (col): TableColumn => ({
                  id: col.field,
                  label: col.headerName,
                  minWidth: col.minWidth,
                  width: col.width,
                  sortable: col.sortable !== false,
                  renderCell: col.renderCell
                    ? (value, row, index) => col.renderCell?.({ value, row, index })
                    : col.valueGetter
                      ? (value, row) => col.valueGetter?.({ value, row, index: 0 }) || ''
                      : undefined,
                })
              )}
              data={filteredStaff}
              emptyState={{
                title: 'No staff members yet',
                subtitle: 'Click "Add Staff Member" to add your first one.',
              }}
              getRowId={(row: StaffRow) => row.id}
              loading={isLoading}
              rowsPerPage={15}
              onRowClick={(row: StaffRow) => openProfile(row)}
            />
          </div>
        </>
      )}

      {activeTab === 'designations' && (
        <>
          {!isConfigLoading && configError && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {configError}
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <DataTable
              columns={designationColumns.map(
                (col): TableColumn => ({
                  id: col.field,
                  label: col.headerName,
                  minWidth: col.minWidth,
                  width: col.width,
                  sortable: col.sortable !== false,
                  renderCell: col.renderCell
                    ? (value, row, index) => col.renderCell?.({ value, row, index })
                    : undefined,
                })
              )}
              data={designationRows}
              emptyState={{ title: 'No designations configured' }}
              getRowId={row => row.id}
              loading={isConfigLoading && !staffConfig}
              pagination={false}
            />
          </div>
        </>
      )}

      {activeTab === 'access' && (
        <>
          {!isConfigLoading && configError && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {configError}
            </div>
          )}
          {isConfigLoading && !staffConfig ? (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-[13px] font-semibold text-gray-500 shadow-sm">
              Loading access levels…
            </div>
          ) : (staffConfig?.accessLevels?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <p className="text-[13px] font-semibold text-gray-600">No access levels configured</p>
            </div>
          ) : (
            <>
              {/* Info banner — frames these as reference tiers; full management ships next phase */}
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                </svg>
                <div>
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-indigo-700">
                    Access tiers
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600">
                      Next phase
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-indigo-600/80">
                    A preview of the access tiers that control what a staff member can see and manage. Assigning and
                    managing custom access levels will be enabled in the next phase.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {staffConfig?.accessLevels.map(level => (
                  <div
                    key={level.id}
                    className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                    style={{ borderTop: `3px solid ${level.color}` }}
                  >
                    {/* Icon badge + label */}
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${level.color}1A`, color: level.color }}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                          />
                          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
                        </svg>
                      </span>
                      <div>
                        <p className="text-[14px] font-bold text-[#21295A]">{level.label}</p>
                        <span
                          className="mt-0.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: `${level.color}1A`, color: level.color }}
                        >
                          {level.scope}
                        </span>
                      </div>
                    </div>

                    <p className="flex-1 text-[12px] leading-relaxed text-gray-500">{level.description}</p>

                    {/* Footer — scope type */}
                    <div className="mt-4 flex items-center gap-1.5 border-t border-gray-50 pt-3 text-[11px] font-medium text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                        />
                      </svg>
                      {level.scopeType === 'all'
                        ? 'Applies to all centres — including future ones'
                        : 'Limited to assigned centre(s)'}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Locked teaser — permission matrix (Part 2) ──────── */}
              <div className="relative mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {/* Faded matrix preview sitting behind the lock */}
                <div aria-hidden className="pointer-events-none select-none p-5 opacity-40 blur-[1.5px]">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        <th className="px-3 py-2">Feature area</th>
                        {(staffConfig?.accessLevels ?? []).map(level => (
                          <th key={level.id} className="px-3 py-2 text-center">
                            {level.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MATRIX_FEATURES.map((feature, r) => (
                        <tr key={feature} className="border-t border-gray-50">
                          <td className="px-3 py-2.5 text-[12px] font-medium text-gray-600">{feature}</td>
                          {(staffConfig?.accessLevels ?? []).map(level => {
                            const grant = matrixGrant(level.scopeType, level.id, r);
                            return (
                              <td key={level.id} className="px-3 py-2.5">
                                <div className="flex justify-center">
                                  {grant === 'full' ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          d="M5 13l4 4L19 7"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                        />
                                      </svg>
                                    </span>
                                  ) : grant === 'partial' ? (
                                    <span className="h-1.5 w-3.5 rounded-full bg-amber-300" />
                                  ) : (
                                    <span className="h-1.5 w-3.5 rounded-full bg-gray-200" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Frosted lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 px-6 text-center backdrop-blur-[2px]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect height="11" rx="2" strokeWidth={1.8} width="14" x="5" y="11" />
                      <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" strokeWidth={1.8} />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-[#21295A]">Access Level Matrix — Coming in Part 2</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-gray-400">
                      Full permission matrix to be defined once the complete feature list is finalised.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                    Next phase
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StaffManagement;
