import React, { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { buildRoute, ROUTES } from '../../constants/routes';
import { getLocalUser } from '../../constants/user';
import { getStaffList } from '../../store/staff/api';

import { formatCentres } from './utils';

import type { StaffListRow } from '../../store/staff/types';
import type { AppDispatch, RootState } from '../../store/store';

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
  status: 'active' | 'invited' | 'draft';
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
};

const docToneClass: Record<StaffRow['documents']['tone'], string> = {
  green: 'text-emerald-600',
  red: 'text-red-500',
  amber: 'text-amber-600',
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Staff' },
  { key: 'designations', label: 'Designations' },
  { key: 'access', label: 'Access Levels' },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  coach: 'Coach',
  staff: 'Staff',
  manager: 'Manager',
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

const formatRoleLabel = (role: string): string =>
  ROLE_LABEL[role.toLowerCase()] ?? role.charAt(0).toUpperCase() + role.slice(1);

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
  return 'active';
};

const mapStaff = (row: StaffListRow): StaffRow => {
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

  const centres = formatCentres(row.assignedCentres, row.facilityCode);

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
      label: row.accessLevel || '—',
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
  const { staffList, isListLoading, listError } = useSelector((state: RootState) => state.staff);

  useEffect(() => {
    dispatch(getStaffList({ facilityCode: getLocalUser().facilityCode, limit: 50, offset: 0 }));
  }, [dispatch]);

  const staff: StaffRow[] = useMemo(() => staffList.map(mapStaff), [staffList]);
  const isLoading = isListLoading;
  const error = listError;

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
          <span className="text-[14px] leading-none">+</span>
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
              className={`relative pb-2.5 text-[13px] font-semibold transition ${
                isActive ? 'text-[#21295A]' : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {isActive && <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[#21295A]" />}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {activeTab === 'all' && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Primary Roles</th>
                  <th className="px-4 py-3">Access Level</th>
                  <th className="px-4 py-3">Centres</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="px-4 py-16 text-center" colSpan={7}>
                      <p className="text-[13px] font-semibold text-gray-500">Loading staff…</p>
                    </td>
                  </tr>
                )}
                {!isLoading && error && (
                  <tr>
                    <td className="px-4 py-16 text-center" colSpan={7}>
                      <p className="text-[13px] font-semibold text-red-500">{error}</p>
                    </td>
                  </tr>
                )}
                {!isLoading && !error && staff.length === 0 && (
                  <tr>
                    <td className="px-4 py-16 text-center" colSpan={7}>
                      <p className="text-[13px] font-semibold text-gray-500">No staff members yet</p>
                      <p className="mt-1 text-[12px] text-gray-400">
                        Click &quot;Add Staff Member&quot; to add your first one.
                      </p>
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !error &&
                  staff.map(row => {
                    const status = statusToneClass[row.status];
                    const openProfile = () =>
                      navigate(buildRoute.viewStaffMember(row.id), { state: { staff: row.raw } });
                    return (
                      <tr key={row.id} className="border-b border-gray-50 transition hover:bg-gray-50/60">
                        <td className="px-4 py-3.5">
                          <button
                            className="flex items-center gap-3 text-left transition hover:opacity-80"
                            type="button"
                            onClick={openProfile}
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
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {row.primaryRoles.map((role, idx) => (
                              <span
                                key={idx}
                                className={`text-[12px] font-medium ${
                                  role.tone === 'muted'
                                    ? 'rounded-md bg-gray-100 px-2 py-0.5 text-gray-600'
                                    : 'text-gray-700'
                                }`}
                              >
                                {role.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[12px] font-semibold ${accessToneClass[row.accessLevel.tone]}`}>
                            {row.accessLevel.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-gray-700">{row.centres}</td>
                        <td className="px-4 py-3.5">
                          <button
                            className={`text-[12px] font-semibold underline-offset-2 transition hover:underline ${docToneClass[row.documents.tone]}`}
                            type="button"
                            onClick={openProfile}
                          >
                            {row.documents.count} uploaded
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[12px] font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              className="text-[12px] font-semibold text-gray-600 transition hover:text-[#21295A]"
                              type="button"
                              onClick={() => navigate(buildRoute.editStaffMember(row.id))}
                            >
                              Edit
                            </button>
                            <button
                              className="text-[12px] font-semibold text-red-500 transition hover:text-red-700"
                              type="button"
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'designations' && (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="text-[13px] font-semibold text-gray-600">Designations</p>
          <p className="mt-1 text-[12px] text-gray-400">Manage designations here.</p>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="text-[13px] font-semibold text-gray-600">Access Levels</p>
          <p className="mt-1 text-[12px] text-gray-400">Define what each access tier can do.</p>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
