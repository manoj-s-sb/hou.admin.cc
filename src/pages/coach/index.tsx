import SectionTitle from '../../components/SectionTitle';

import CoachScheduleGrid from './components/CoachScheduleGrid';

const CoachSchedule: React.FC = () => {
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
        <CoachScheduleGrid />
      </div>
    </div>
  );
};

export default CoachSchedule;
