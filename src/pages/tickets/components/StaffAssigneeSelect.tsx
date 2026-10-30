import React, { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';

import endpoints from '../../../constants/endpoints';
import api from '../../../services';
import { RootState } from '../../../store/store';
import { EMAIL_RE } from '../../../utils/validation';
import { formatRoleLabel } from '../../staff/utils';

// Minimal shape returned by the Tickets module's own "assignableStaff"
// action (/admin/tickets) -- deliberately NOT the Staff Management module's
// full StaffListRow/its own /admin/staff/list endpoint, which requires Staff
// Management read permission. Assigning a ticket has nothing to do with that
// module, so this picker gets its own lightweight, Tickets-scoped data
// source instead (see TicketService.list_assignable_staff on the backend).
interface AssignableStaffRow {
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string[];
  status: string;
}

// Sentinel <option> value for "type an email instead of picking someone from
// the list" — distinct from any real staffId/email so it can never collide
// with an actual selectable person.
const CUSTOM_EMAIL_OPTION = '__custom_email__';

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
 * Four sources feed the list: this centre's staff (scoped, empty for a
 * brand-new centre), the logged-in caller themself ("Assign to me" — always
 * available, no centre dependency), every superadmin account by name (also
 * always available — superadmins aren't tied to one centre, so a ticket at a
 * centre with no staff of its own yet can still be escalated to a real,
 * named person instead of being blocked), and a free-typed email address for
 * anyone not in this system at all (an outside vendor, a staff member not
 * yet onboarded) — Assign To is entirely optional, so this field can also be
 * left empty to file the ticket under the centre with nobody assigned yet.
 */
const StaffAssigneeSelect: React.FC<Props> = ({ facilityCode, value, onChange, className, disabled }) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [staffList, setStaffList] = useState<AssignableStaffRow[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    if (!facilityCode) return;
    let cancelled = false;
    setIsListLoading(true);
    setListError('');
    api
      .post(endpoints.tickets, { action: 'assignableStaff', facilityCode, limit: 200, offset: 0 })
      .then(res => {
        if (cancelled) return;
        setStaffList((res.data?.data?.staff ?? []) as AssignableStaffRow[]);
      })
      .catch(err => {
        if (!cancelled) setListError(err?.response?.data?.message || err?.message || 'Failed to fetch staff list');
      })
      .finally(() => {
        if (!cancelled) setIsListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityCode]);

  // Superadmins are global, not centre-scoped — fetched once, independently of
  // the centre-scoped staffList above, into local state so the two never clobber
  // each other.
  const [superAdmins, setSuperAdmins] = useState<AssignableStaffRow[]>([]);
  const [isLoadingSuperAdmins, setIsLoadingSuperAdmins] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsLoadingSuperAdmins(true);
    api
      .post(endpoints.tickets, { action: 'assignableStaff', role: 'superadmin', limit: 50, offset: 0 })
      .then(res => {
        if (cancelled) return;
        const rows = (res.data?.data?.staff ?? []) as AssignableStaffRow[];
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

  // list_assignable_staff itself scopes by facilityCode server-side — trust
  // that, only filter active here.
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

  // "+ Enter an email…" — assign directly to someone not in any list above
  // (an outside vendor, a staff member not yet onboarded). The email itself
  // is both the id and the display name, same convention as the "Notify
  // additional recipients" CC field.
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState('');

  const addCustomEmail = () => {
    const trimmed = customEmail.trim();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setCustomEmailError('Enter a valid email address');
      return;
    }
    if (value.some(v => v.staffId.toLowerCase() === trimmed.toLowerCase())) {
      setCustomEmailError('That person is already added');
      return;
    }
    onChange([...value, { staffId: trimmed, name: trimmed, email: trimmed }]);
    setCustomEmail('');
    setCustomEmailError('');
    setShowCustomEmailInput(false);
  };

  if (listError) {
    return <div style={{ fontSize: 11, color: '#dc2626' }}>Could not load staff: {listError}</div>;
  }

  // "+ Enter an email…" is always available regardless of centre/staff state,
  // so there's always at least one option once loading finishes — unlike
  // before this option existed, there's no "nothing left to add" state to
  // show a disabled picker for.
  const stillLoading = (!!facilityCode && isListLoading) || isLoadingSuperAdmins;

  return (
    <div>
      <select
        className={className}
        disabled={disabled || stillLoading}
        value=""
        onChange={e => {
          if (e.target.value === CUSTOM_EMAIL_OPTION) {
            setShowCustomEmailInput(true);
          } else if (e.target.value) {
            addPerson(e.target.value);
          }
        }}
      >
        <option value="">{stillLoading ? 'Loading…' : 'Add a person…'}</option>
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
        <option value={CUSTOM_EMAIL_OPTION}>+ Enter an email…</option>
      </select>
      {showCustomEmailInput && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              className={className}
              placeholder="Enter an email and press Enter…"
              type="text"
              value={customEmail}
              onChange={e => {
                setCustomEmail(e.target.value);
                if (customEmailError) setCustomEmailError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomEmail();
                }
                if (e.key === 'Escape') {
                  setShowCustomEmailInput(false);
                  setCustomEmail('');
                  setCustomEmailError('');
                }
              }}
            />
            <button
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={addCustomEmail}
            >
              Add
            </button>
          </div>
          {customEmailError && <p className="mt-1 text-[11px] text-red-500">{customEmailError}</p>}
        </div>
      )}
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
