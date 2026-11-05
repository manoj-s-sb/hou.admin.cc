import { useCallback, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { useScopedFacilityCode } from '../../hooks/useScopedFacilityCode';
import { ACCESS_SCOPES, canRead, getSelfOnlyPersonnelRole } from '../../rbac';
import { coachSlots, staffSlots } from '../../store/slots/api';
import { CoachSlotsResponse } from '../../store/slots/types';
import { AppDispatch, RootState } from '../../store/store';
import { getTodayDateInChicago } from '../../utils/dateUtils';
import CoachScheduleGrid from '../coach/components/CoachScheduleGrid';

/**
 * One sidebar entry ("Team Schedule") covering both personnel types, replacing
 * the two separate Coach Schedule / Staff Schedule entries. Both tabs are now
 * real, backend-wired grids — the Coach tab dispatches coachSlots/
 * updateCoachSlots/generateCoachSlots (admin/coach/*), the Staff tab dispatches
 * staffSlots/updateCoachSlots/generateStaffSlots (admin/staff/*; availability
 * edits reuse the same updateCoachSlots endpoint, which isn't coach-specific).
 * Nothing about CoachScheduleGrid itself changed here, only which thunks feed
 * it and a tab toggle instead of two separate sidebar links.
 *
 * Self-login scoping: a coach-only or staff-only login (no admin-tier role
 * alongside it) never sees the tab toggle at all — they're locked to the one
 * tab matching their own role. The server-side calendar/edit/generate routes
 * already enforce this as the real security boundary (filtering/rejecting
 * anything not their own code) regardless of what this UI shows; hiding the
 * toggle here is just so such a login never even sees a choice that would be
 * rejected anyway. The coach/staff-switcher dropdown inside CoachScheduleGrid
 * needs no change for this — a self-scoped calendar response only ever
 * contains that one person, so "more than one person" is already false.
 */

const TeamSchedule: React.FC = () => {
  const selfOnlyRole = getSelfOnlyPersonnelRole();
  // Each tab is only offered when the account actually has read access to
  // that module — Coach Schedule and Staff Schedule are independently
  // grantable permissions, so a login with only one of them should never see
  // (let alone click into) a tab whose backend call would just be rejected.
  const canViewCoach = canRead(ACCESS_SCOPES.coaches);
  const canViewStaff = canRead(ACCESS_SCOPES.staffSchedule);
  const showTabToggle = !selfOnlyRole && canViewCoach && canViewStaff;
  const defaultTab: 'coach' | 'staff' = selfOnlyRole ?? (canViewCoach ? 'coach' : 'staff');
  const [tab, setTab] = useState<'coach' | 'staff'>(defaultTab);

  const { coachSlotsList, isLoading, staffSlotsList, isStaffLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();
  const facilityCode = useScopedFacilityCode();

  const formatDateInChicago = useCallback((date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(date);
  }, []);

  const fetchCoachSlots = useCallback(
    (startDate: string, endDate: string) => {
      dispatch(coachSlots({ startDate, endDate, facilityCode }));
    },
    [dispatch, facilityCode]
  );

  const fetchStaffSlots = useCallback(
    (startDate: string, endDate: string) => {
      dispatch(staffSlots({ startDate, endDate, facilityCode }));
    },
    [dispatch, facilityCode]
  );

  useEffect(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const start = getTodayDateInChicago();
    const end = formatDateInChicago(endDate);

    if (tab === 'coach') {
      fetchCoachSlots(start, end);
    } else {
      fetchStaffSlots(start, end);
    }
  }, [tab, fetchCoachSlots, fetchStaffSlots, formatDateInChicago]);

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Team Schedule</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">
          Manage coach and staff availability and slot assignments
        </p>
      </div>

      {showTabToggle && (
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition ${
              tab === 'coach' ? 'bg-[#21295A] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
            type="button"
            onClick={() => setTab('coach')}
          >
            Coach
          </button>
          <button
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition ${
              tab === 'staff' ? 'bg-[#21295A] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
            type="button"
            onClick={() => setTab('staff')}
          >
            Staff
          </button>
        </div>
      )}

      {tab === 'coach' ? (
        <CoachScheduleGrid
          coachSlotsList={coachSlotsList as CoachSlotsResponse[]}
          isLoading={isLoading}
          onDateRangeChange={fetchCoachSlots}
        />
      ) : (
        <CoachScheduleGrid
          coachSlotsList={staffSlotsList as CoachSlotsResponse[]}
          isLoading={isStaffLoading}
          personnelType="staff"
          onDateRangeChange={fetchStaffSlots}
        />
      )}
    </div>
  );
};

export default TeamSchedule;
