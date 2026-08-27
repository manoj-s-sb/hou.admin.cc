import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getStaffList } from '../../../store/staff/api';
import { AppDispatch, RootState } from '../../../store/store';
import { formatRoleLabel } from '../../staff/utils';

// Designation shown in the picker — e.g. "NOC Team" — instead of email, which
// isn't useful for picking the right person to assign.
const designationOf = (userType: string[] | undefined): string =>
  userType?.length ? userType.map(formatRoleLabel).join(', ') : 'Staff';

export interface SelectedStaff {
  staffId: string;
  name: string;
  email: string;
}

interface Props {
  /** Centre to fetch active staff for. No fetch (and no options) while empty. */
  facilityCode: string | undefined;
  /** Currently selected people. Removing one makes them selectable again. */
  value: SelectedStaff[];
  onChange: (next: SelectedStaff[]) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Picks one or more specific, currently-active (login-enabled) staff members for
 * a given centre — used wherever a ticket is assigned to "Others". The backend
 * ticket contract only has a single assignedToId/assignedToName today, so only
 * the FIRST person picked here becomes the real assignee; anyone picked after
 * that is carried as extra context by the caller (e.g. CC'd via
 * additionalRecipients) until a real multi-assignee field exists server-side.
 */
const StaffAssigneeSelect: React.FC<Props> = ({ facilityCode, value, onChange, className, disabled }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { staffList, isListLoading, listError } = useSelector((state: RootState) => state.staff);

  useEffect(() => {
    if (!facilityCode) return;
    dispatch(getStaffList({ facilityCode, limit: 200, offset: 0 }));
  }, [dispatch, facilityCode]);

  // getStaffList itself scopes by facilityCode server-side (matches assignedCentres,
  // not just the single primary facilityCode field) — trust that, only filter active here.
  // Raw status isn't guaranteed lowercase (mirrors normalizeStatus in pages/staff/index.tsx) —
  // anything other than invited/draft/inactive/suspended counts as active, same as there.
  const activeStaff = staffList.filter(s => {
    const v = s.status?.toLowerCase();
    return v !== 'invited' && v !== 'draft' && v !== 'inactive' && v !== 'suspended';
  });

  const selectedIds = new Set(value.map(v => v.staffId));
  const selectable = activeStaff.filter(s => !selectedIds.has(s.staffId));

  const addPerson = (staffId: string) => {
    const row = activeStaff.find(s => s.staffId === staffId);
    if (!row) return;
    const name = `${row.firstName} ${row.lastName}`.trim() || row.email;
    onChange([...value, { staffId: row.staffId, name, email: row.email }]);
  };

  const removePerson = (staffId: string) => onChange(value.filter(v => v.staffId !== staffId));

  if (listError) {
    return <div style={{ fontSize: 11, color: '#dc2626' }}>Could not load staff: {listError}</div>;
  }

  return (
    <div>
      <select
        className={className}
        disabled={disabled || !facilityCode}
        value=""
        onChange={e => {
          if (e.target.value) addPerson(e.target.value);
        }}
      >
        <option value="">
          {!facilityCode
            ? 'Select a centre first'
            : isListLoading
              ? 'Loading staff…'
              : selectable.length
                ? '+ Add a person…'
                : activeStaff.length
                  ? 'All active staff already added'
                  : staffList.length
                    ? `0 of ${staffList.length} staff at this centre are active`
                    : 'No staff found at this centre'}
        </option>
        {selectable.map(s => (
          <option key={s.staffId} value={s.staffId}>
            {`${s.firstName} ${s.lastName}`.trim() || s.email} — {designationOf(s.userType)}
          </option>
        ))}
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
