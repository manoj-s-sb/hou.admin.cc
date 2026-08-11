import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getStaffList } from '../../../store/staff/api';
import { AppDispatch, RootState } from '../../../store/store';

interface Props {
  /** Centre to fetch active staff for. No fetch (and no options) while empty. */
  facilityCode: string | undefined;
  /** Selected staffId, or '' for none selected. */
  value: string;
  onChange: (staffId: string, staffName: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Picks a specific, currently-active (login-enabled) staff member for a given
 * centre — used wherever a ticket is assigned to "Others" so it links to a real
 * account (assignedToId) instead of a free-text guess at a name.
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

  if (listError) {
    return <div style={{ fontSize: 11, color: '#dc2626' }}>Could not load staff: {listError}</div>;
  }

  return (
    <div>
      <select
        className={className}
        disabled={disabled || !facilityCode}
        value={value}
        onChange={e => {
          const row = activeStaff.find(s => s.staffId === e.target.value);
          const name = row ? `${row.firstName} ${row.lastName}`.trim() || row.email : '';
          onChange(e.target.value, name);
        }}
      >
        <option value="">
          {!facilityCode
            ? 'Select a centre first'
            : isListLoading
              ? 'Loading staff…'
              : activeStaff.length
                ? 'Select a person…'
                : staffList.length
                  ? `0 of ${staffList.length} staff at this centre are active`
                  : 'No staff found at this centre'}
        </option>
        {activeStaff.map(s => (
          <option key={s.staffId} value={s.staffId}>
            {`${s.firstName} ${s.lastName}`.trim() || s.email} — {s.email}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StaffAssigneeSelect;
