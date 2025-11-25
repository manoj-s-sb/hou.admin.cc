import SectionTitle from '../../components/SectionTitle';

import CalendarHeader from './components/calendarHeader';

const SlotBookings: React.FC = () => {
  return (
    <div className="w-full max-w-full">
      <SectionTitle
        description="Manage your slot bookings."
        inputPlaceholder=""
        search={false}
        title="Slot Bookings"
        value=""
      />
      <div className="flex flex-col gap-4">
        <CalendarHeader />
      </div>
    </div>
  );
};

export default SlotBookings;
