import { useCallback, useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
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
    return formatter.format(date); // en-CA format gives YYYY-MM-DD
  }, []);

  const fetchCoachSlots = useCallback(
    (startDate: string, endDate: string) => {
      dispatch(
        coachSlots({
          startDate,
          endDate,
          facilityCode: 'HOU01',
        })
      );
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
      <SectionTitle
        description="Manage coach availability."
        inputPlaceholder=""
        search={false}
        title="Coach Schedule"
        value=""
      />
      <div className="flex flex-col gap-3 sm:gap-4">
        <CoachScheduleGrid
          coachSlotsList={coachSlotsList as CoachSlotsResponse[]}
          isLoading={isLoading}
          onDateRangeChange={fetchCoachSlots}
        />
      </div>
    </div>
  );
};

export default CoachSchedule;
