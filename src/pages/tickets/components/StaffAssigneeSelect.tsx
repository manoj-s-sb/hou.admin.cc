import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { getStaffList } from '../../../store/staff/api';
import { AppDispatch, RootState } from '../../../store/store';
import { formatRoleLabel } from '../../staff/utils';

import type { StaffListRow } from '../../../store/staff/types';

// Designation shown in the picker — e.g. "NOC Team" — instead of email, which
// isn't useful for picking the right person to assign.
const designationOf = (userType: string[] | undefined): string =>
  userType?.length ? userType.map(formatRoleLabel).join(', ') : 'Staff';

// Raw status isn't guaranteed lowercase (mirrors normalizeStatus in pages/staff/index.tsx) —
// anything other than invited/draft/inactive/suspended counts as active.
const isActiveStatus = (status: string | undefined): boolean => {
  const v = status?.toLowerCase();
  return v !== 'invited' && v !== 'draft' && v !== 'inactive' && v !== 'suspended';
};

export interface SelectedStaff {
  staffId: string;
  name: string;
  email: string;
}

interface Props {
  /** Centre to fetch active staff for. "Assign to me" and superadmins are always
   * available regardless of this, so a brand-new centre with no staff yet can
   * still get a ticket assigned to a real person. */
  facilityCode: string | undefined;
  /** Currently selected people. Removing one makes them selectable again. */
  value: SelectedStaff[];
  onChange: (next: SelectedStaff[]) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Picks one or more specific, currently-active (login-enabled) people for a
 * ticket — used wherever a ticket is assigned to "Others". The backend
 * ticket contract only has a single assignedToId/assignedToName today, so only
 * the FIRST person picked here becomes the real assignee; anyone picked after
 * that is carried as extra context by the caller (e.g. CC'd via
 * additionalRecipients) until a real multi-assignee field exists server-side.
 *
 * Three sources feed the list: this centre's staff (scoped, empty for a
 * brand-new centre), the logged-in caller themself ("Assign to me" — always
 * available, no centre dependency), and every superadmin account by name
 * (also always available — superadmins aren't tied to one centre, so a
 * ticket at a centre with no staff of its own yet can still be escalated to
 * a real, named person instead of being blocked).
 */
const StaffAssigneeSelect: React.FC<Props> = ({ facilityCode, value, onChange, className, disabled }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { staffList, isListLoading, listError } = useSelector((state: RootState) => state.staff);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!facilityCode) return;
    dispatch(getStaffList({ facilityCode, limit: 200, offset: 0 }));
  }, [dispatch, facilityCode]);

  // Superadmins are global, not centre-scoped — fetched once, independently of
  // the centre-scoped staffList above, into local state so the two never clobber
  // each other in the shared Redux slice.
  const [superAdmins, setSuperAdmins] = useState<StaffListRow[]>([]);
  const [isLoadingSuperAdmins, setIsLoadingSuperAdmins] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsLoadingSuperAdmins(true);
    api
      .post(endpoints.staff.list, { role: 'superadmin', limit: 50, offset: 0 })
      .then(res => {
        if (cancelled) return;
        const rows = (res.data?.data?.staff ?? []) as StaffListRow[];
        setSuperAdmins(rows.filter(s => isActiveStatus(s.status)));
      })
      .catch(() => {
        if (!cancelled) setSuperAdmins([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSuperAdmins(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // getStaffList itself scopes by facilityCode server-side (matches assignedCentres,
  // not just the single primary facilityCode field) — trust that, only filter active here.
  const activeStaff = staffList.filter(s => isActiveStatus(s.status));

  const meEntry: SelectedStaff | null = currentUser
    ? {
        staffId: currentUser.userId,
        name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() || currentUser.email,
        email: currentUser.email,
      }
    : null;

  const selectedIds = new Set(value.map(v => v.staffId));
  const selectableStaff = activeStaff.filter(s => !selectedIds.has(s.staffId));
  // Someone who's both this centre's staff and a superadmin shows once, in the centre list.
  const centreStaffIds = new Set(activeStaff.map(s => s.staffId));
  const selectableSuperAdmins = superAdmins.filter(s => !selectedIds.has(s.staffId) && !centreStaffIds.has(s.staffId));
  const meSelectable =
    !!meEntry &&
    !selectedIds.has(meEntry.staffId) &&
    !centreStaffIds.has(meEntry.staffId) &&
    !superAdmins.some(s => s.staffId === meEntry.staffId);

  const addPerson = (staffId: string) => {
    if (meEntry && staffId === meEntry.staffId) {
      onChange([...value, meEntry]);
      return;
    }
    const row = [...activeStaff, ...superAdmins].find(s => s.staffId === staffId);
    if (!row) return;
    const name = `${row.firstName} ${row.lastName}`.trim() || row.email;
    onChange([...value, { staffId: row.staffId, name, email: row.email }]);
  };

  const removePerson = (staffId: string) => onChange(value.filter(v => v.staffId !== staffId));

  if (listError) {
    return <div style={{ fontSize: 11, color: '#dc2626' }}>Could not load staff: {listError}</div>;
  }

  const hasAnyOptions = meSelectable || selectableStaff.length > 0 || selectableSuperAdmins.length > 0;
  const stillLoading = (!!facilityCode && isListLoading) || isLoadingSuperAdmins;

  return (
    <div>
      <select
        className={className}
        disabled={disabled || (!hasAnyOptions && !stillLoading)}
        value=""
        onChange={e => {
          if (e.target.value) addPerson(e.target.value);
        }}
      >
        <option value="">{stillLoading ? 'Loading…' : hasAnyOptions ? 'Add a person…' : 'No one left to add'}</option>
        {meSelectable && meEntry && <option value={meEntry.staffId}>★ Assign to me — {meEntry.name}</option>}
        {selectableStaff.length > 0 && (
          <optgroup label={facilityCode ? "This centre's staff" : 'Staff'}>
            {selectableStaff.map(s => (
              <option key={s.staffId} value={s.staffId}>
                {`${s.firstName} ${s.lastName}`.trim() || s.email} — {designationOf(s.userType)}
              </option>
            ))}
          </optgroup>
        )}
        {selectableSuperAdmins.length > 0 && (
          <optgroup label="Superadmins">
            {selectableSuperAdmins.map(s => (
              <option key={s.staffId} value={s.staffId}>
                {`${s.firstName} ${s.lastName}`.trim() || s.email} — {s.email}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span
              key={v.staffId}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#9096be] bg-[#ecedf4] py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#21295a]"
              title={i === 0 ? 'Primary assignee' : 'CC’d on notifications (no multi-assignee support yet)'}
            >
              {i === 0 && '★ '}
              {v.name}
              <button
                aria-label={`Remove ${v.name}`}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#21295a]/70 hover:text-[#21295a]"
                type="button"
                onClick={() => removePerson(v.staffId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffAssigneeSelect;
