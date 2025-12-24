import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import { coachSlots } from '../../store/slots/api';
import { CoachSlotsResponse } from '../../store/slots/types';
import { AppDispatch, RootState } from '../../store/store';

import CoachScheduleGrid from './components/CoachScheduleGrid';

const CoachSchedule: React.FC = () => {
  const { coachSlotsList, isLoading } = useSelector((state: RootState) => state.slots);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(
      coachSlots({
        facilityCode: 'HOU01',
      })
    );
  }, [dispatch]);

  return (
    <div className="w-full">
      <SectionTitle
        description="Manage coach availability across multiple dates."
        inputPlaceholder=""
        search={false}
        title="Coach Schedule"
        value=""
      />
      <div className="flex flex-col gap-3 sm:gap-4">
        <CoachScheduleGrid coachSlotsList={coachSlotsList as CoachSlotsResponse[]} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default CoachSchedule;
