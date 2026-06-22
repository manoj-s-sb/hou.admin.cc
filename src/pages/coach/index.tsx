import { useCallback, useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getFacilityCode } from '../../constants/user';
import { coachSlots } from '../../store/slots/api';
import { CoachSlotsResponse } from '../../store/slots/types';
import { AppDispatch, RootState } from '../../store/store';
import { getTodayDateInChicago } from '../../utils/dateUtils';

import CoachScheduleGrid from './components/CoachScheduleGrid';

const CoachSchedule: React.FC = () => {
  const { coachSlotsList, isLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();

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
      dispatch(coachSlots({ startDate, endDate, facilityCode: getFacilityCode() }));
    },
    [dispatch]
  );

  useEffect(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    fetchCoachSlots(getTodayDateInChicago(), formatDateInChicago(endDate));
  }, [dispatch, fetchCoachSlots, formatDateInChicago]);

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Coach Schedule</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">Manage coach availability and slot assignments</p>
      </div>

      <CoachScheduleGrid
        coachSlotsList={coachSlotsList as CoachSlotsResponse[]}
        isLoading={isLoading}
        onDateRangeChange={fetchCoachSlots}
      />
    </div>
  );
};

export default CoachSchedule;
