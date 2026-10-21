import { useCallback, useMemo, useState } from 'react';

import { CoachSlotsResponse, CoachSlot } from '../../store/slots/types';
import { getTodayDateInChicago } from '../../utils/dateUtils';
import CoachScheduleGrid from '../coach/components/CoachScheduleGrid';

/**
 * FRONTEND-ONLY PREVIEW. There is no staff-availability backend yet (only
 * coaches have a real `coachslot` roster/calendar today) — this page mirrors
 * ../coach/index.tsx's layout and reuses CoachScheduleGrid (personnelType=
 * 'staff') purely to show what the screen will look like, backed by a small
 * hardcoded mock roster instead of a real API call. Every edit (Mark
 * Available/Unavailable, Mark day off, Generate slots) is applied to local
 * component state only — see CoachScheduleGrid's `personnelType === 'staff'`
 * branches, which skip the real coach backend route entirely.
 *
 * Swap this out for a real fetch (mirroring ../coach/index.tsx's
 * coachSlots-dispatching pattern) once a staff-schedule backend exists.
 */

const SLOT_DURATION_MINUTES = 45;
const SLOTS_PER_DAY = (24 * 60) / SLOT_DURATION_MINUTES;
const DAYS_SHOWN = 8;

const MOCK_STAFF = [
  { coachCode: 'S001', name: 'Priya Nair' },
  { coachCode: 'S002', name: 'Marcus Lee' },
];

const addDaysInChicago = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dateFormatter.format(date);
};

const buildMockSlotsForDate = (coachCode: string, date: string): CoachSlot[] => {
  const slots: CoachSlot[] = [];
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const minute = i * SLOT_DURATION_MINUTES;
    const startHH = String(Math.floor(minute / 60)).padStart(2, '0');
    const startMM = String(minute % 60).padStart(2, '0');
    const endMinute = minute + SLOT_DURATION_MINUTES;
    const endHH = String(Math.floor(endMinute / 60) % 24).padStart(2, '0');
    const endMM = String(endMinute % 60).padStart(2, '0');
    slots.push({
      coachSlotCode: `${date.replace(/-/g, '')}_${coachCode}_${startHH}${startMM}`,
      startTime: `${date}T${startHH}:${startMM}:00`,
      endTime: `${date}T${endHH}:${endMM}:00`,
      isAvailable: false,
      status: 'disabled',
      supportedSessionTypes: ['induction', 'tour'],
      duration: SLOT_DURATION_MINUTES,
    });
  }
  return slots;
};

const buildMockCoachSlotsList = (startDate: string): CoachSlotsResponse[] => {
  const dates = Array.from({ length: DAYS_SHOWN }, (_, i) => addDaysInChicago(startDate, i));
  return [
    {
      bookingCode: '',
      bookingType: '',
      startDate,
      endDate: dates[dates.length - 1],
      facilityCode: '',
      coaches: MOCK_STAFF.map(staff => ({
        coachCode: staff.coachCode,
        name: staff.name,
        specialization: [],
        experienceYears: 0,
        certifications: [],
        hourlyRate: 0,
        description: '',
        profileImageUrl: '',
        availability: dates.map(date => ({
          date,
          isHoliday: false,
          slots: buildMockSlotsForDate(staff.coachCode, date),
        })),
      })),
    },
  ];
};

const StaffSchedule: React.FC = () => {
  const [rangeStart, setRangeStart] = useState(getTodayDateInChicago());

  const coachSlotsList = useMemo(() => buildMockCoachSlotsList(rangeStart), [rangeStart]);

  // CoachScheduleGrid calls this both on Previous/Next/Today navigation and
  // after a mock "Generate slots" apply — here it just re-anchors the mock
  // week to whatever start date was requested; no network call.
  const handleDateRangeChange = useCallback((startDate: string) => {
    setRangeStart(startDate);
  }, []);

  return (
    <div className="w-full">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Staff Schedule</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">Manage staff availability and slot assignments</p>
      </div>

      <CoachScheduleGrid
        coachSlotsList={coachSlotsList}
        isLoading={false}
        personnelType="staff"
        onDateRangeChange={handleDateRangeChange}
      />
    </div>
  );
};

export default StaffSchedule;
